CREATE TABLE "page_visits" (
  "id" TEXT NOT NULL,
  "ip" TEXT NOT NULL,
  "page" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  CONSTRAINT "page_visits_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "page_visits_ip_page_date_key" ON "page_visits"("ip", "page", "date");
CREATE INDEX "page_visits_page_date_idx" ON "page_visits"("page", "date");
