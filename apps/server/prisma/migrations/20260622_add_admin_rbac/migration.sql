CREATE TABLE "admin_roles" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "permissions" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "admin_roles_name_key" ON "admin_roles"("name");

CREATE TABLE "admin_users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "google_id" TEXT,
  "name" TEXT,
  "avatar" TEXT,
  "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
  "role_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");
CREATE UNIQUE INDEX "admin_users_google_id_key" ON "admin_users"("google_id");
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "admin_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
