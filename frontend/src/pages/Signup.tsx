import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Input, Label, FieldError } from "../components/ui/Input";

export function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) return setError(error);
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-card border border-border bg-white p-6 text-center shadow-card">
          <h1 className="mb-2 text-xl font-semibold text-ink">Check your inbox</h1>
          <p className="mb-6 text-sm text-ink-secondary">
            We sent a confirmation link to <span className="font-medium text-ink">{email}</span>. Confirm your
            email, then log in.
          </p>
          <Button className="w-full" onClick={() => navigate("/login")}>
            Go to login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <TrendingUp size={18} />
          </div>
          <span className="text-lg font-semibold text-ink">BizWise AI</span>
        </Link>

        <div className="rounded-card border border-border bg-white p-6 shadow-card">
          <h1 className="mb-1 text-xl font-semibold text-ink">Create your account</h1>
          <p className="mb-6 text-sm text-ink-secondary">Start making smarter decisions in minutes.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <FieldError message={error ?? undefined} />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Get started free"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-ink-secondary">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
