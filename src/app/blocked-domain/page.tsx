import { BlockedDomainContent } from "./_compontents/BlockedDomainContent";

export const metadata = {
    title: "Access Forbidden",
    description: "You do not have access to this page.",
};

export default function BlockedDomainPage() {
    return <BlockedDomainContent />;
}