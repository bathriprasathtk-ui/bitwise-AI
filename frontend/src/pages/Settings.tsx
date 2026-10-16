import { useEffect, useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { Card, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Label, FieldError } from "../components/ui/Input";
import type { Business } from "../types";

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"];

export function Settings() {
  const { user, updatePassword, signOut } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [dark, setDark] = useState(false);

  useEffect(() => {
    supabase
      .from("businesses")
      .select("*")
      .eq("user_id", user?.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setBusiness(data);
          setName(data.name);
          setIndustry(data.industry ?? "");
          setCurrency(data.currency);
        }
      });
  }, [user?.id]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!business) return;
    setSavingProfile(true);
    setProfileError(null);
    setProfileSaved(false);
    const { error } = await supabase
      .from("businesses")
      .update({ name, industry, currency })
      .eq("id", business.id);
    setSavingProfile(false);
    if (error) return setProfileError(error.message);
    setProfileSaved(true);
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordSaved(false);
    const { error } = await updatePassword(newPassword);
    setPasswordSaving(false);
    if (error) return setPasswordError(error);
    setNewPassword("");
    setPasswordSaved(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-ink dark:text-slate-100">
          <SettingsIcon size={20} className="text-primary" /> Settings
        </h1>
        <p className="text-sm text-ink-secondary">Manage your business profile and account.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Business profile</CardTitle>
          </CardHeader>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <Label htmlFor="name">Business name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Retail, SaaS, Consulting" />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-[#0F1729] dark:border-slate-700 dark:text-slate-100"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <FieldError message={profileError ?? undefined} />
            {profileSaved && <p className="text-sm text-success">Saved.</p>}
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <div className="mb-4 text-sm text-ink dark:text-slate-200">
              <span className="text-ink-secondary">Signed in as </span>
              {user?.email}
            </div>
            <form onSubmit={savePassword} className="space-y-4">
              <div>
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <FieldError message={passwordError ?? undefined} />
              {passwordSaved && <p className="text-sm text-success">Password updated.</p>}
              <Button type="submit" variant="secondary" disabled={passwordSaving}>
                {passwordSaving ? "Updating…" : "Update password"}
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink dark:text-slate-200">Dark mode</span>
              <button
                role="switch"
                aria-checked={dark}
                onClick={() => setDark((d) => !d)}
                className={`h-6 w-11 rounded-full transition-colors ${dark ? "bg-primary" : "bg-slate-300"}`}
              >
                <span
                  className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform ${dark ? "translate-x-[22px]" : ""}`}
                />
              </button>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danger zone</CardTitle>
            </CardHeader>
            <Button variant="danger" onClick={signOut}>
              Log out of all devices
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
