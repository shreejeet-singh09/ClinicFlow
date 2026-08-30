import './globals.css'
import { Providers } from './providers'
import ServiceWorker from '../components/ServiceWorker'

export const metadata = {
  title: 'CarePair — calm, connected clinic queues',
  description: 'A focused multi-tenant queue workspace for modern clinics.',
  manifest: '/manifest.webmanifest',
}

export const viewport = {
  themeColor: '#2563eb',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Aggressive stale-cache buster: clears any old service worker + Cache Storage on first load so users don't get stuck on a previous bundle. Runs BEFORE React hydration. */}
        <script dangerouslySetInnerHTML={{__html:`
          (function(){try{
            var V='CarePair-2026-08-25e';
            var prev=localStorage.getItem('cf_v');
            if(prev && prev!==V){
              if('caches' in window){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k)})})}
              if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister()})})}
              localStorage.setItem('cf_v',V);
              setTimeout(function(){location.reload()},50);
              return;
            }
            localStorage.setItem('cf_v',V);
          }catch(e){}})();
        `}} />
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body>
        <Providers>{children}</Providers>
        <ServiceWorker />
      </body>
    </html>
  )
}
