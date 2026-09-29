"use client"

import { useState, type ComponentProps, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { BrandLink } from "@/components/brand-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import styles from "./auth.module.css"

export function AuthShell({ mode, children }: { mode: "login" | "signup"; children: ReactNode }) {
  const [notice, setNotice] = useState("")
  const isLogin = mode === "login"

  return (
    <div data-auth-page className={styles.page}>
      <section className={styles.panel} aria-labelledby="auth-title">
        <div className={styles.brand}><BrandLink /></div>
        <div className={styles.content}>
          <header className={styles.header}>
            <h1 id="auth-title">{isLogin ? "Welcome back!" : "Get Started Now"}</h1>
            {isLogin && <p>Enter your credentials to access your account</p>}
          </header>
          {children}
          <div className={styles.divider} aria-hidden="true">
            <Image src="/brand/auth/divider.svg" alt="" width={400} height={2} unoptimized />
            <span>Or</span>
          </div>
          <div className={styles.social}>
            {(["Google", "Apple"] as const).map((provider) => (
              <Button
                key={provider}
                type="button"
                variant="outline"
                className={styles.socialButton}
                aria-describedby="social-availability"
                onClick={() => setNotice(`${provider} sign-in: Coming soon.`)}
              >
                <Image src={`/brand/auth/${provider.toLowerCase()}.svg`} alt="" width={24} height={24} unoptimized />
                Sign in with {provider}
              </Button>
            ))}
          </div>
          <p id="social-availability" className={styles.availability}>Google and Apple sign-in coming soon</p>
          {notice && <p role="status" className={styles.notice}>{notice}</p>}
          <p className={styles.footer}>
            {isLogin ? "Don’t have an account?" : "Have an account?"}{" "}
            <Link href={isLogin ? "/signup" : "/login"}>{isLogin ? "Sign up" : "Sign in"}</Link>
          </p>
        </div>
      </section>
      <div className={styles.photo} aria-hidden="true">
        <Image
          src="/brand/auth/grocery-bag.png"
          alt=""
          fill
          loading="eager"
          sizes="(max-width: 899px) 0px, 51vw"
          className={styles.photoImage}
        />
      </div>
    </div>
  )
}

export function AuthField({ label, id, type, ...props }: ComponentProps<typeof Input> & { label: string; id: string }) {
  const [visible, setVisible] = useState(false)
  const isPassword = type === "password"
  const passwordLabel = id === "confirm" ? "confirm password" : "password"

  return (
    <div className={styles.field}>
      <Label htmlFor={id}>{label}</Label>
      <div className={styles.inputWrapper}>
        <Input {...props} id={id} type={isPassword && visible ? "text" : type} aria-required="true" className={isPassword ? styles.passwordInput : styles.input} />
        {isPassword && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={styles.passwordToggle}
            aria-label={`${visible ? "Hide" : "Show"} ${passwordLabel}`}
            aria-pressed={visible}
            aria-controls={id}
            disabled={props.disabled}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        )}
      </div>
    </div>
  )
}
