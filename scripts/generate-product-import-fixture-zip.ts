import fs from "node:fs";
import path from "node:path";
import yazl from "yazl";

const output = path.resolve("test-fixtures/product-import/photo-product.zip");
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
const webp = Buffer.from("RIFFxxxxWEBP", "ascii");
const jpeg = Buffer.from([255, 216, 255, 224, 0, 0]);
const archive = new yazl.ZipFile();
archive.addBuffer(png, "photo-products/KK/KK-007 BIRU/01.png");
archive.addBuffer(webp, "photo-products/KK/KK-007 MERAH/01.webp");
archive.addBuffer(jpeg, "photo-products/KK/KK-017/KK-017.jpg");
archive.addBuffer(jpeg, "photo-products/KL/KL-003/01.jpeg");
archive.addBuffer(Buffer.from("glTF"), "photo-products/KL/KL-003/model.glb");
archive.addBuffer(Buffer.from("video"), "photo-products/KL/KL-003/demo.mp4");
archive.addBuffer(jpeg, "photo-products/KL/orphan-a.jpg");
archive.addBuffer(png, "photo-products/KL/orphan-b.PNG");
archive.outputStream.pipe(fs.createWriteStream(output)).on("close", () => console.log(output));
archive.end();
