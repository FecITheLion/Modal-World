# Orbital Relics

Orbital Relics is a PG-13, adult-audience PHP PWA about growing a single analogy sphere and sending it into short ring-out battles. It uses the compact PHP page/helper structure of the supplied CoinFlip reference, without outcome betting.

## Requirements

- PHP 8.2+ with PDO SQLite, `mbstring`, and cURL
- HTTPS and persistent writable storage for production hosting
- A PHP-enabled web server configured to serve this directory

For local development:

```sh
php -S 127.0.0.1:8080
```

On first request the app creates `data/orbital-relics.sqlite`. Keep this directory private, persistent, and backed up. `ORBITAL_DATA_DIR` may point to a private writable directory outside the web root. SQLite is intended for a small, single-instance deployment.

## Included

- Password-hashed accounts, secure session cookies, and CSRF protection
- One active sphere per account, with randomized sphere type, colors, and symbols
- Text and file analogy imports, personal truth tables, and community popularity signals
- Five-second bot battles with alternating spin controls, live odds, discoveries, drops, and cellular division
- Online player discovery, one-use friend challenge links, and a no-consecutive-rematch rule
- Upgradeable sphere diameter and spin, funded by non-cash credits capped at 10 earned per account per UTC day
- Player-owned credit auctions with an upgrade-value reserve, escrowed bids, refunds when outbid, and no withdrawal after listing
- Installable PWA shell; authenticated pages and API responses are not cached

## Disabled in this preview

PayPal checkout, cash-value credit purchases, cash withdrawals, Pulsar purchases, and outcome wagers are not implemented. Credits and auction bids are in-app only; do not represent them as money or enable cash redemption without a reviewed payment, marketplace, and legal-compliance implementation.

Before production, add email verification, login rate limiting, a documented data-retention policy, database backups, and an approved marketplace/payment design.
