# Venue configuration

Copy `establishment.example.json` to `establishment.json` and fill in values for your deployment.

```bash
cp config/establishment.example.json config/establishment.json
```

`establishment.json` is gitignored — never commit venue-specific production values.

### League module licensing

Set per-sport flags under `modules.leagues` to match what the venue purchased:

```json
"modules": {
  "leagues": {
    "pool": true,
    "darts": false,
    "volleyball": false
  }
}
```

The API enforces this tier: staff cannot enable unlicensed sports in the dashboard, and unlicensed leagues cannot be created. If `modules.leagues` is omitted, all three sports are treated as licensed (backward compatibility for older configs).

Staff still control runtime visibility via **Sports enabled** toggles in the admin leagues page (`SiteSettings.sportsEnabled`).

The config file is the target source of truth for per-venue branding as the platform layer matures. Today, most values are still managed through the staff dashboard (`SiteSettings` in MongoDB) and environment variables. See [docs/PLATFORM.md](../docs/PLATFORM.md) for the roadmap.
