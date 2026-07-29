# Shipping staging readiness

Status saat ini shipping masih mock/manual. Provider real belum dipilih dan belum diimplementasikan.

## Env

```bash
SHIPPING_PROVIDER=mock
DEFAULT_ORIGIN_CITY=Bandung
DEFAULT_ORIGIN_POSTAL_CODE=
SHIPPING_PROVIDER_API_KEY=
```

`DEFAULT_ORIGIN_CITY=Bandung` adalah default saat ini.

## Validasi destination

Request ongkir harus memvalidasi:

- city;
- postal code;
- item product ID;
- quantity.

Berat dari frontend tidak boleh dipercaya. Backend memakai canonical/placeholder weight sampai data berat produk resmi tersedia.

## Rate limit dan fallback

- Shipping rates memiliki rate limit foundation.
- Provider error tidak boleh bocor ke customer.
- Fallback manual tersedia.

## Checklist sebelum provider real

- API key valid.
- Rate calculation verified.
- Weight source dari backend.
- Provider error tidak bocor.
- Tracking number format valid.
- Webhook/callback jika provider mendukung.
- Staging smoke test ongkir dan tracking pass.
