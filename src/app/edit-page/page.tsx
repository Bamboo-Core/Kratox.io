import { redirect } from "next/navigation";
import { EditPage } from "../blocked-domain/_compontents/EditPage";

export default function EditPageRoute() {
    const isBilling = process.env.NEXT_PUBLIC_BILLING_ACCESS;

    if (isBilling !== 'true') {
        redirect("/blocked-domain");
    }

    return <EditPage />;
}
