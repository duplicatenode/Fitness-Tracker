import Redirect from '../components/Redirect';

// Unknown URLs go back to the overview
export default function NotFound() {
    return <Redirect to="/" />;
}
