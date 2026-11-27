from django.urls import path
from . import views

urlpatterns = [
    # Product APIs
    path("products/", views.products_api, name="products"),
    path(
        "products/<int:pk>/",
        views.product_detail_api,
        name="product_detail_api"
    ),

    # Invoice APIs
    path("invoices/", views.invoices_api, name="invoices"),
    path("create-invoice/", views.create_invoice, name="create-invoice"),

    # Authentication APIs
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("current-user/", views.current_user, name="current-user"),
]