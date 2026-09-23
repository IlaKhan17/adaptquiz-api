import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../../contexts/AuthContext";
import { register, googleLogin } from "../../lib/api";
import { errorDetail } from "../../lib/utils";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import AuthLayout from "../../components/layout/AuthLayout";

export default function Register() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (credential: string) => {
    setError("");
    setLoading(true);
    try {
      const { access_token } = await googleLogin(credential);
      await signIn(access_token);
      navigate("/dashboard");
    } catch {
      setError("Google sign-up didn’t go through. Try again, or use your email and a password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    setLoading(true);
    try {
      const { access_token } = await register(email, password);
      await signIn(access_token);
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(errorDetail(err, "The account couldn’t be created. Check your email and try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free. Your notes and quizzes stay private to you."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-pen hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={(res) => {
            if (res.credential) handleGoogleSuccess(res.credential);
          }}
          onError={() => setError("Google sign-up didn’t go through. Try again, or use your email and a password.")}
          width="320"
          text="signup_with"
          shape="rectangular"
        />
      </div>

      <div className="flex items-center gap-3 my-6" aria-hidden>
        <div className="flex-1 h-px bg-rule" />
        <span className="text-sm text-ink-muted">or with email</span>
        <div className="flex-1 h-px bg-rule" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <div className="relative">
          <Input
            label="Password"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            hint="At least 8 characters."
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            aria-label={showPw ? "Hide password" : "Show password"}
            className="absolute right-3 top-[2.35rem] text-ink-muted hover:text-ink"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-marker bg-marker-wash rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth loading={loading} size="lg">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
