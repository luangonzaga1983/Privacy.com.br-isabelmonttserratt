import "./globals.css";

export const metadata = {
  title: "Isabel Montserratt",
  description: "Conteúdo exclusivo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
