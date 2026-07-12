import "./globals.css";
import ThemeProvider from "@/components/providers/ThemeProvider";
import AuthProvider from "@/components/providers/AuthProvider";
import NotificationProvider from "@/components/providers/NotificationProvider";
import MarketplaceChatbot from "@/components/MarketplaceChatbot";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              {children}
              <MarketplaceChatbot />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}