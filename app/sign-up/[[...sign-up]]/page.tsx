import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-gray-100">
      <SignUp
        appearance={{
          elements: {
            footerActionLink: "text-primary hover:text-primary-dark",
            formButtonPrimary: "bg-primary hover:bg-primary-dark",
          },
        }}
        signInUrl="/sign-in"
        fallbackRedirectUrl="/projects"
      />
    </div>
  );
}
