import { PageHeader } from "../recipes/page-header";
import { getMyProfile } from "./data";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const profile = await getMyProfile();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <PageHeader back="/" title="Profile" />
      <ProfileForm displayName={profile.display_name} />
      <form action="/auth/signout" method="post" className="border-t pt-5">
        <button className="text-sm text-muted-foreground underline">Sign out</button>
      </form>
    </main>
  );
}
