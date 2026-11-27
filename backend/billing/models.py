from django.db import models
from decimal import Decimal
from django.core.exceptions import ValidationError


class Product(models.Model):
    name = models.CharField(max_length=150)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    gst_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("0.00")
    )

    is_active = models.BooleanField(default=True)
    quantity = models.PositiveIntegerField(default=0)

    def clean(self):
        errors = {}

        # Product name validation
        if not self.name or not self.name.strip():
            errors["name"] = "Product name is required."

        # Price validation
        if self.price is not None and self.price <= 0:
            errors["price"] = "Price must be greater than zero."

        # GST validation
        allowed_gst = [
            Decimal("0.00"),
            Decimal("5.00"),
            Decimal("12.00"),
            Decimal("18.00"),
            Decimal("28.00"),
        ]

        if self.gst_rate not in allowed_gst:
            errors["gst_rate"] = "GST must be 0, 5, 12, 18 or 28."

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return self.name


class Invoice(models.Model):
    customer_name = models.CharField(max_length=150, default="Walk-in Customer")
    created_at = models.DateTimeField(auto_now_add=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"Invoice #{self.id}"


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    product_name = models.CharField(max_length=150)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.product_name} x {self.quantity}"
