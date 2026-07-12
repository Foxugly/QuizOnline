from django.contrib.auth import get_user_model

User = get_user_model()
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "SuperPassword123"
U1_EMAIL = "user1@example.com"
U1_PASSWORD = "SuperPassword123"


def run():
    # ----------------------   CREATE SUPERUSER ----------------------------
    print("\nCREATE SUPERUSER")
    if not User.objects.filter(email=ADMIN_EMAIL).exists():
        User.objects.create_superuser(
            email=ADMIN_EMAIL,
            password=ADMIN_PASSWORD
        )
        print("Superuser created.")
    else:
        print("Superuser already exists.")
    # -------------------------- CREATE USER1 ---------------------------------
    print("\nCREATE USER U1")
    if not User.objects.filter(email=U1_EMAIL).exists():
        u1 = User.objects.create_user(
            email=U1_EMAIL,
            first_name="User",
            last_name="One",
            password=U1_PASSWORD
        )
        print("\nUtilisateur créé :", u1)
    else:
        print("\nUtilisateur existe déjà.")
