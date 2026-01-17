import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-gray-100">
      <SignIn
        appearance={{
          elements: {
            footerActionLink: "text-primary hover:text-primary-dark",
            formButtonPrimary: "bg-primary hover:bg-primary-dark",
          },
        }}
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/projects"
      />
    </div>
  );
}
