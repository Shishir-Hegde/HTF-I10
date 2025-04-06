"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

interface LoginFormProps {
  onToggleForm?: () => void;
}

export function LoginForm({ onToggleForm }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (!result?.error) {
        router.push("/");
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 rounded-lg bg-[#241a13] shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center theme-text-accent">
        Welcome Back
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="username"
            className="text-sm font-medium text-foreground font-jaro"
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            className="form-input font-jaro bg-[#A49694] text-[#021013] placeholder:text-[#021013]/60"
            required
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium text-foreground font-jaro"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="form-input font-jaro bg-[#A49694] text-[#021013] placeholder:text-[#021013]/60"
            required
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Log In"}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center text-sm">
        <p className="text-muted-foreground">
          Don&apos;t have an account?{" "}
          <button
            onClick={onToggleForm}
            className="text-primary hover:underline font-medium"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
