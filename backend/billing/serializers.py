from rest_framework import serializers
from .models import Product, Invoice, InvoiceItem


class ProductSerializer(serializers.ModelSerializer):

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Product name cannot be empty.")

        # Duplicate product name check
        existing_product = Product.objects.filter(
            name__iexact=value.strip(), is_active=True
        )

        if self.instance:
            existing_product = existing_product.exclude(id=self.instance.id)

        if existing_product.exists():
            raise serializers.ValidationError("This product already exists.")

        return value.strip()

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")

        return value

    def validate_gst_rate(self, value):
        allowed_gst = [0, 5, 12, 18, 28]

        if value not in allowed_gst:
            raise serializers.ValidationError("GST must be 0, 5, 12, 18 or 28.")

        return value

    class Meta:
        model = Product
        fields = "__all__"


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = [
            "id",
            "product",
            "product_name",
            "price",
            "quantity",
            "gst_rate",
            "line_total",
        ]


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id",
            "customer_name",
            "created_at",
            "subtotal",
            "gst_amount",
            "grand_total",
            "items",
        ]
