# Quotation workflow

Phase 13 memindahkan request quotation dari localStorage-only ke server foundation.

## Flow customer

1. Customer login mock.
2. Customer menambahkan produk ke cart.
3. Jika ada logo bordir, cart line membawa `embroideryPlacements` dengan `logoFileId`.
4. Customer membuka `/quote`.
5. Halaman submit ke `POST /api/quotation/request`.
6. Server memvalidasi cart dengan product service dan storage scope company.
7. Server membuat quotation record.
8. Server mencoba mengirim:
   - email notifikasi ke sales,
   - email konfirmasi ke customer.
9. Customer diarahkan ke `/quotes/[id]?new=1`.
10. Dashboard mengambil quotation dari `GET /api/quotation`.

## API

### POST `/api/quotation/request`

Butuh header:

```http
x-ofissio-company-id
x-ofissio-company-name
x-ofissio-user-id
x-ofissio-user-email
x-ofissio-user-name
x-ofissio-role
```

Body utama:

```json
{
  "items": [
    {
      "productId": "kk-006",
      "selectedColor": "Abu Color Block",
      "sizeMatrix": { "S": 0, "M": 20, "L": 0, "XL": 0, "2XL": 0, "3XL": 0 },
      "customization": null,
      "embroideryPlacements": []
    }
  ],
  "customerNotes": "Butuh penawaran resmi",
  "picName": "Customer",
  "picEmail": "customer@example.com",
  "picWhatsapp": "08123456789"
}
```

### GET `/api/quotation`

Mengembalikan quotation milik company session.

### GET `/api/quotation/[id]`

Mengembalikan detail quotation jika company session sama.

## Status

Quotation status awal:

- `submitted`: request tercatat, email belum berhasil/masih dilewati.
- `emailed`: request tercatat dan email `sent` atau `mocked`.

Email status:

- `mocked`
- `sent`
- `failed`
- `skipped`
- `queued`

## Yang bukan scope Phase 13

- Harga final otomatis.
- Quotation PDF final.
- Admin sales dashboard production.
- Database persistence live.
- Payment/shipping live.
