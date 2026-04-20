import "./globals.css";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Import Google Manrope font for headings and UI elements and Google Material Symbols font for icons. */}
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&amp;display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      
      <body className="h-screen overflow-hidden">
        <div className="grid h-full grid-cols-[220px_minmax(0,1fr)]">
          {/* Sidebar (Fixed) */}
          <Sidebar />

          <div className="grid h-full min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
            {/* Header (Fixed) */}
            <Header />

            {/* Main Content (Dragable) */}
            <main className="min-h-0 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
