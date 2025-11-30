import "./globals.css";
import { Fredoka } from "next/font/google";

const fredoka = Fredoka({
  subsets: ["latin"],
  weights: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
});

export const metadata = {
  title: "Monad Doodles",
  description: "Low IQ, high vibes · Monad Doodle OS",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${fredoka.variable} min-h-screen bg-slate-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
