-- Phase 21 (v1 lite): provider's external scheduling URL.
--
-- Solo providers typically already have Calendly, Cal.com, or similar.
-- Rather than building a calendar in v1, we let the provider paste their
-- public booking URL and surface it as a "Book appointment" CTA on the
-- patient dashboard.

alter table provider_profiles
  add column if not exists scheduling_url text
    check (scheduling_url is null or length(scheduling_url) <= 1024);
