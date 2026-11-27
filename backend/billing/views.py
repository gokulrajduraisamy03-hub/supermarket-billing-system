from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token

from .models import Product, Invoice, InvoiceItem
from .serializers import ProductSerializer, InvoiceSerializer


def money(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def products_api(request):
    if request.method == "GET":
        products = Product.objects.filter(is_active=True).order_by("name")
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)

    serializer = ProductSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def product_detail_api(request, pk):
    try:
        product = Product.objects.get(pk=pk, is_active=True)
    except Product.DoesNotExist:
        return Response(
            {"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND
        )

    if request.method == "GET":
        serializer = ProductSerializer(product)
        return Response(serializer.data)

    elif request.method in ["PUT", "PATCH"]:
        serializer = ProductSerializer(
            product, data=request.data, partial=(request.method == "PATCH")
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == "DELETE":
        product.is_active = False
        product.save(update_fields=["is_active"])

        return Response(
            {"message": "Product deleted successfully!"}, status=status.HTTP_200_OK
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def invoices_api(request):
    invoices = Invoice.objects.prefetch_related("items").order_by("-id")
    serializer = InvoiceSerializer(invoices, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_invoice(request):
    items = request.data.get("items", [])
    customer_name = request.data.get("customer_name", "Walk-in Customer")

    # Validate cart
    if not isinstance(items, list) or not items:
        return Response(
            {"error": "At least one product is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate customer name
    if not isinstance(customer_name, str):
        return Response(
            {"error": "Customer name must be valid text."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    customer_name = customer_name.strip() or "Walk-in Customer"

    # Validate cart items
    for item in items:
        if not isinstance(item, dict):
            return Response(
                {"error": "Invalid product item."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if "product" not in item or "quantity" not in item:
            return Response(
                {"error": "Product ID and quantity are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    try:
        with transaction.atomic():
            subtotal = Decimal("0.00")
            gst_amount = Decimal("0.00")
            prepared_items = []

            # Store total quantity for each product
            product_quantities = {}

            for item in items:
                product_id = item.get("product")
                quantity = item.get("quantity")

            if (
                isinstance(quantity, bool)
                or not isinstance(quantity, int)
                or quantity <= 0
            ):
                return Response(
                    {"error": "Quantity must be a positive integer."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Add duplicate product quantities
            product_quantities[product_id] = (
                product_quantities.get(product_id, 0) + quantity
            )

            # Check combined stock
            for product_id, total_quantity in product_quantities.items():

                product = Product.objects.select_for_update().get(
                    id=product_id,
                    is_active=True,
                )

                if total_quantity > product.quantity:
                    return Response(
                        {
                            "error": (
                                f"Insufficient stock for {product.name}. "
                                f"Available: {product.quantity}, "
                                f"Requested: {total_quantity}."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # Continue with invoice calculations
            for item in items:
                product_id = item.get("product")
                quantity = item.get("quantity")

                product = Product.objects.get(
                    id=product_id,
                    is_active=True,
                )

                price = product.price
                gst_rate = product.gst_rate

                base = money(price * quantity)
                gst = money(base * gst_rate / Decimal("100"))

                subtotal += base
                gst_amount += gst

                prepared_items.append(
                    {
                        "product": product,
                        "product_name": product.name,
                        "price": price,
                        "quantity": quantity,
                        "gst_rate": gst_rate,
                        "line_total": base + gst,
                    }
                )

            invoice = Invoice.objects.create(
                customer_name=customer_name,
                subtotal=money(subtotal),
                gst_amount=money(gst_amount),
                grand_total=money(subtotal + gst_amount),
            )

            for item in prepared_items:
                product = item["product"]
                product.quantity -= item["quantity"]
                product.save(update_fields=["quantity"])

                InvoiceItem.objects.create(
                    invoice=invoice,
                    **item,
                )

        invoice = Invoice.objects.prefetch_related("items").get(id=invoice.id)

        return Response(
            InvoiceSerializer(invoice).data,
            status=status.HTTP_201_CREATED,
        )

    except Product.DoesNotExist:
        return Response(
            {"error": "Product not found or is no longer available."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    except (TypeError, ValueError, ArithmeticError):
        return Response(
            {"error": "Invalid invoice data."},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get("username")
    password = request.data.get("password")

    user = authenticate(username=username, password=password)

    if user is not None:
        token, created = Token.objects.get_or_create(user=user)

        return Response(
            {
                "message": "Login successful",
                "token": token.key,
                "username": user.username,
            }
        )

    return Response(
        {"error": "Invalid username or password"}, status=status.HTTP_401_UNAUTHORIZED
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    request.user.auth_token.delete()
    return Response({"message": "Logout successful"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user(request):
    return Response({"username": request.user.username, "email": request.user.email})
