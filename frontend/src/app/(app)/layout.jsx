import AppShell from '../../components/AppShell';

// Every route inside (app)/ needs a signed-in user and shares the sidebar + header
export default function SignedInLayout({ children }) {
    return <AppShell>{children}</AppShell>;
}
