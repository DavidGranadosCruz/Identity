ALTER TABLE "UserSettings"
ADD COLUMN "themePreference" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN "languagePreference" TEXT NOT NULL DEFAULT 'es';
