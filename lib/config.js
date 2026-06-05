// Configuração do site. Troque o número pelo WhatsApp real (formato: 55 + DDD + número).
export const WHATSAPP = "5511964533002";

export function whatsappLink(message) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
}
