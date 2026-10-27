import '../index.css';
import Providers from './providers';

// Root layout: wraps every route in the auth and toast providers
export const metadata = {
    title: { default: 'FitTrack', template: '%s | FitTrack' },
    description: 'Fitness tracker on MySQL and Memurai',
    icons: { icon: '/favicon.svg' }
};

export const viewport = { themeColor: '#0b1424' };

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
