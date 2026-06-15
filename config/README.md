# Venue configuration

Copy `establishment.example.json` to `establishment.json` and fill in values for your deployment.

```bash
cp config/establishment.example.json config/establishment.json
```

`establishment.json` is gitignored — never commit venue-specific production values.

The config file is the target source of truth for per-venue branding as the platform layer matures. Today, most values are still managed through the staff dashboard (`SiteSettings` in MongoDB) and environment variables. See [docs/PLATFORM.md](../docs/PLATFORM.md) for the roadmap.
