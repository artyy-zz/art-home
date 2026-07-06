ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "usernameNormalized" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;

UPDATE "User"
SET "username" = CASE lower("email")
  WHEN 'arbnorjeta1@gmail.com' THEN 'Arbnor'
  WHEN 'artiibela0@gmail.com' THEN 'Art'
  WHEN 'patrik@gmail.com' THEN 'Patrik'
  ELSE COALESCE(NULLIF("name", ''), split_part("email", '@', 1), "id")
END
WHERE "username" IS NULL OR "username" = '';

UPDATE "User"
SET "usernameNormalized" = lower("username")
WHERE "usernameNormalized" IS NULL OR "usernameNormalized" = '';

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "usernameNormalized" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "User_usernameNormalized_key" ON "User"("usernameNormalized");
CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User"("username");
