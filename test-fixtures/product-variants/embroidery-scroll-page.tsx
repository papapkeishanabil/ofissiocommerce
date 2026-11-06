import { ProductDetail } from "@/components/product/ProductDetail";
import { PRODUCT_MOCK_DATA } from "@/features/products/product.mock-data";
import { createDefaultEmbroideryPricingZones } from "@/features/products/embroidery-pricing";

const description=Array.from({length:45},(_,index)=>`<p>Bagian ${index+1}: Kemeja kerja nyaman untuk aktivitas harian. Pilih warna dan ukuran yang sesuai, lalu lengkapi dengan bordir logo perusahaan.</p>`).join("");
const product={...PRODUCT_MOCK_DATA[0]!,id:"scroll-fixture",slug:"scroll-fixture",name:"Kemeja dengan deskripsi panjang",status:"published" as const,has_3d_model:false,model_3d:null,model_3d_url:null,model_3d_id:null,model_3d_version:null,embroidery_zones:[],priceFrom:85000,moq:1,colors:["Khaki"],available_colors:["Khaki"],available_sizes:["S","M"],images:[],mainImage:undefined,descriptionHtml:description,sizeChart:[{size:"S" as const,chest:96,length:70},{size:"M" as const,chest:100,length:72}]};
export default function EmbroideryScrollFixture(){return <ProductDetail product={product} globalEmbroideryPricing={{enabled:true,mode:"flat_per_piece",zones:createDefaultEmbroideryPricingZones()}}/>;}
