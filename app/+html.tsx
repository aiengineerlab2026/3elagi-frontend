import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";
import { GLOBAL_WEB_CSS } from "@/components/web/globalWebStyles";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ar" dir="ltr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, viewport-fit=cover"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_WEB_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
