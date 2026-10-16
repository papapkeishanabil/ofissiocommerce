// Public customer-support contact confirmed from the Ofissio contact button.
export const OFISSIO_SUPPORT_WHATSAPP = "6285959440993";

export function customerWhatsappHref(orderNumber?: string, configuredNumber = OFISSIO_SUPPORT_WHATSAPP) {
  let number = configuredNumber.replace(/\D/g, "");
  if (number.startsWith("0")) number = `62${number.slice(1)}`;
  if (!/^[1-9]\d{7,14}$/.test(number)) return null;
  const message = orderNumber
    ? `Halo tim Ofissio, saya ingin bertanya tentang pesanan ${orderNumber}.`
    : "Halo tim Ofissio, saya membutuhkan bantuan terkait pesanan seragam.";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
