"use client";

import {
    Activity,
    ArrowDown,
    ArrowRight,
    CalendarDays,
    Check,
    ChevronRight,
    Clock3,
    HeartPulse,
    Menu,
    ShieldCheck,
    Sparkles,
    Users,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function LandingPage() {
    const [mobileMenu, setMobileMenu] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 30);
        };

        window.addEventListener("scroll", handleScroll);

        const revealObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        revealObserver.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.12,
                rootMargin: "0px 0px -50px 0px",
            }
        );

        document
            .querySelectorAll(".cf-reveal")
            .forEach((element) => revealObserver.observe(element));

        return () => {
            window.removeEventListener("scroll", handleScroll);
            revealObserver.disconnect();
        };
    }, []);

    const clinics = [
        "Care Plus Clinic",
        "City Health Center",
        "Sunrise Clinic",
        "LifeLine Hospital",
        "Hope Care Clinic",
        "Metro Health",
        "Wellness Point",
        "Green Valley Clinic",
    ];

    const countries = [
        {
            flag: "🇮🇳",
            name: "India",
            status: "Where we start",
            active: true,
        },
        {
            flag: "🇮🇪",
            name: "Ireland",
            status: "Future market",
            active: false,
        },
        {
            flag: "🇬🇧",
            name: "United Kingdom",
            status: "Future market",
            active: false,
        },
        {
            flag: "🇨🇦",
            name: "Canada",
            status: "Future market",
            active: false,
        },
    ];

    return (
        <main className="relative min-h-screen overflow-hidden bg-white text-slate-950">

            {/* =====================================================
        GLOBAL CLINICFLOW ANIMATION
        This covers the ENTIRE landing page
        ===================================================== */}
            <div className="clinic-global-bg">
                <div className="clinic-bg-blob clinic-bg-blob-1" />
                <div className="clinic-bg-blob clinic-bg-blob-2" />
                <div className="clinic-bg-blob clinic-bg-blob-3" />
                <div className="clinic-bg-blob clinic-bg-blob-4" />

                <div className="clinic-bg-grid" />

                <div className="clinic-bg-ring ring-1" />
                <div className="clinic-bg-ring ring-2" />
                <div className="clinic-bg-ring ring-3" />

                <div className="clinic-bg-beam beam-1" />
                <div className="clinic-bg-beam beam-2" />
                <div className="clinic-bg-beam beam-3" />

                <div className="clinic-bg-particle p1" />
                <div className="clinic-bg-particle p2" />
                <div className="clinic-bg-particle p3" />
                <div className="clinic-bg-particle p4" />
                <div className="clinic-bg-particle p5" />
                <div className="clinic-bg-particle p6" />
                <div className="clinic-bg-particle p7" />
                <div className="clinic-bg-particle p8" />
                <div className="clinic-bg-particle p9" />
                <div className="clinic-bg-particle p10" />

                <div className="clinic-bg-glow glow-1" />
                <div className="clinic-bg-glow glow-2" />
                <div className="clinic-bg-glow glow-3" />
            </div>

            <div className="clinic-global-bg">

                <div className="clinic-bg-blob clinic-bg-blob-1" />
                <div className="clinic-bg-blob clinic-bg-blob-2" />
                <div className="clinic-bg-blob clinic-bg-blob-3" />
                <div className="clinic-bg-blob clinic-bg-blob-4" />

                <div className="clinic-bg-grid" />

                <div className="clinic-bg-ring ring-1" />
                <div className="clinic-bg-ring ring-2" />
                <div className="clinic-bg-ring ring-3" />

                <div className="clinic-bg-beam beam-1" />
                <div className="clinic-bg-beam beam-2" />
                <div className="clinic-bg-beam beam-3" />

                <div className="clinic-bg-particle p1" />
                <div className="clinic-bg-particle p2" />
                <div className="clinic-bg-particle p3" />
                <div className="clinic-bg-particle p4" />
                <div className="clinic-bg-particle p5" />
                <div className="clinic-bg-particle p6" />
                <div className="clinic-bg-particle p7" />
                <div className="clinic-bg-particle p8" />
                <div className="clinic-bg-particle p9" />
                <div className="clinic-bg-particle p10" />

                <div className="clinic-bg-glow glow-1" />
                <div className="clinic-bg-glow glow-2" />
                <div className="clinic-bg-glow glow-3" />

            </div>

    {/* ============================================================
          NAVBAR
      ============================================================ */}

    <header
        className={`sticky top-0 z-50 border-b transition-all duration-500 ${scrolled
            ? "border-slate-200 bg-blue-50/95 shadow-sm backdrop-blur-2xl"
    : "border-transparent bg-blue-50/80 backdrop-blur-xl"
            }`}
    >
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-6 lg:px-8">
            {/* Logo */}

            <a
                href="/landing"
                className="group flex items-center gap-3"
            >
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition duration-300 group-hover:rotate-3 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-blue-600/25">
                    <Activity
                        size={20}
                        strokeWidth={2.4}
                    />

                    <span className="absolute inset-0 rounded-xl border border-white/30" />
                </div>

                <span className="text-xl font-bold tracking-tight">
                    <span className="text-blue-600">Clinic</span>Flow
                </span>
            </a>

            {/* Desktop navigation */}

            <nav className="hidden items-center gap-8 md:flex">
                <a
                    href="#features"
                    className="nav-link"
                >
                    Features
                </a>

                <a
                    href="#how-it-works"
                    className="nav-link"
                >
                    How it works
                </a>

                <a
                    href="#journey"
                    className="nav-link"
                >
                    Our journey
                </a>

                <a
                    href="#about"
                    className="nav-link"
                >
                    About
                </a>
            </nav>

            {/* Desktop buttons */}

            <div className="hidden items-center gap-3 md:flex">
                <a
                    href="/login"
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                    Sign in
                </a>

                <a
                    href="/login"
                    className="group flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20"
                >
                    Let's onboard
                    <ArrowRight
                        size={16}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                </a>
            </div>

            {/* Mobile menu */}

            <button
                type="button"
                onClick={() => setMobileMenu(!mobileMenu)}
                className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100 md:hidden"
            >
                {mobileMenu ? (
                    <X size={24} />
                ) : (
                    <Menu size={24} />
                )}
            </button>
        </div>

        {mobileMenu && (
            <div className="border-t border-slate-100 bg-white px-6 py-5 md:hidden">
                <nav className="flex flex-col gap-2">
                    {[
                        ["Features", "#features"],
                        ["How it works", "#how-it-works"],
                        ["Our journey", "#journey"],
                        ["About", "#about"],
                    ].map(([label, href]) => (
                        <a
                            key={label}
                            href={href}
                            onClick={() => setMobileMenu(false)}
                            className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            {label}
                        </a>
                    ))}

                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <a
                            href="/login"
                            className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold"
                        >
                            Sign in
                        </a>

                        <a
                            href="/login"
                            className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white"
                        >
                            Let's onboard
                        </a>
                    </div>
                </nav>
            </div>
        )}
    </header>

    {/* ============================================================
          HERO
      ============================================================ */}

    <section className="relative z-10 overflow-hidden">
        {/* Animated grid */}

        <div className="pointer-events-none absolute inset-0 opacity-[0.35]">
            <div className="hero-grid absolute inset-0" />
        </div>

        {/* Decorative blobs */}

        <div className="pointer-events-none absolute left-[45%] top-[80px] h-[420px] w-[420px] animate-[pulseGlow_6s_ease-in-out_infinite] rounded-full bg-blue-200/25 blur-3xl" />

        <div className="pointer-events-none absolute right-[-100px] top-[250px] h-[300px] w-[300px] rounded-full bg-indigo-100/30 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 pb-20 pt-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:pb-28 lg:pt-28">
            {/* Hero copy */}

            <div className="cf-reveal reveal-left">
                <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm backdrop-blur">
                    <Sparkles
                        size={15}
                        className="animate-pulse"
                    />
                    Built for modern clinics
                </div>

                <h1 className="max-w-3xl text-5xl font-bold leading-[1.02] tracking-[-0.055em] sm:text-6xl lg:text-[72px]">
                    Run your clinic.
                    <span className="gradient-text mt-2 block">
                        Without the chaos.
                    </span>
                </h1>

                <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
                    ClinicFlow brings appointments, queues, patients, staff and
                    everyday clinic operations into one simple workspace.
                </p>

                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                    <a
                        href="/login"
                        className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-600/20 transition duration-300 hover:-translate-y-1 hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-600/30"
                    >
                        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                        <span className="relative">
                            Let's onboard
                        </span>

                        <ArrowRight
                            size={17}
                            className="relative transition-transform duration-300 group-hover:translate-x-1"
                        />
                    </a>

                    <a
                        href="/"
                        className="group inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
                    >
                        Sign in
                        <ChevronRight
                            size={16}
                            className="transition-transform duration-300 group-hover:translate-x-1"
                        />
                    </a>
                </div>

                {/* Benefits */}

                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
                    <TrustItem
                        icon={<ShieldCheck size={17} />}
                        text="Secure & reliable"
                    />

                    <TrustItem
                        icon={<Check size={17} />}
                        text="Simple to use"
                    />

                    <TrustItem
                        icon={<Users size={17} />}
                        text="Built for clinics"
                    />
                </div>
            </div>

            {/* Dashboard */}

            <div className="cf-reveal reveal-right relative">
                {/* Floating card */}

                <div className="float-card absolute -left-7 top-14 z-20 hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl sm:block">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                            <Check
                                size={18}
                                className="text-emerald-600"
                            />
                        </div>

                        <div>
                            <p className="text-[11px] font-medium text-slate-400">
                                Queue updated
                            </p>

                            <p className="text-sm font-bold text-slate-900">
                                Patient #12 ready
                            </p>
                        </div>
                    </div>
                </div>

                {/* Floating right card */}

                <div className="float-card-delay absolute -right-5 bottom-16 z-20 hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl sm:block">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                            <HeartPulse
                                size={18}
                                className="text-blue-600"
                            />
                        </div>

                        <div>
                            <p className="text-[11px] font-medium text-slate-400">
                                Today's flow
                            </p>

                            <p className="text-sm font-bold text-slate-900">
                                Running smoothly
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main dashboard */}

                <div className="dashboard-float relative rounded-[30px] border border-slate-200 bg-white/95 p-3 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
                    <div className="overflow-hidden rounded-[24px] bg-slate-50">
                        {/* Fake browser bar */}

                        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-5 py-4">
                            <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                            <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                            <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />

                            <div className="ml-4 h-7 flex-1 rounded-lg bg-slate-50" />
                        </div>

                        <div className="p-5">
                            {/* App top */}

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                                        <Activity size={18} />
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-medium text-slate-400">
                                            CLINICFLOW
                                        </p>

                                        <p className="text-sm font-bold text-slate-900">
                                            Dashboard
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Live
                                </div>
                            </div>

                            {/* Stats */}

                            <div className="mt-6 grid grid-cols-3 gap-3">
                                <DashboardStat
                                    icon={<Users size={14} />}
                                    label="Patients"
                                    value="48"
                                    detail="+12%"
                                />

                                <DashboardStat
                                    icon={<Clock3 size={14} />}
                                    label="In queue"
                                    value="12"
                                    detail="3 urgent"
                                />

                                <DashboardStat
                                    icon={<CalendarDays size={14} />}
                                    label="Appointments"
                                    value="24"
                                    detail="Today"
                                />
                            </div>

                            {/* Queue */}

                            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">
                                            Today's queue
                                        </p>

                                        <p className="mt-1 text-[10px] text-slate-400">
                                            Real-time clinic flow
                                        </p>
                                    </div>

                                    <span className="text-[10px] font-bold text-blue-600">
                                        View all
                                    </span>
                                </div>

                                <div className="mt-4 space-y-2">
                                    <QueueItem
                                        number="1"
                                        name="Ramesh Kumar"
                                        status="Consultation"
                                        active
                                    />

                                    <QueueItem
                                        number="2"
                                        name="Priya Sharma"
                                        status="Waiting"
                                    />

                                    <QueueItem
                                        number="3"
                                        name="Amit Verma"
                                        status="Waiting"
                                    />
                                </div>
                            </div>

                            {/* Bottom */}

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-semibold text-slate-400">
                                            Weekly consultations
                                        </p>

                                        <Activity
                                            size={14}
                                            className="text-blue-600"
                                        />
                                    </div>

                                    <div className="mt-4 flex h-16 items-end gap-1.5">
                                        {[35, 50, 42, 68, 58, 78, 92].map(
                                            (height, index) => (
                                                <div
                                                    key={index}
                                                    className="group/bar flex-1"
                                                >
                                                    <div
                                                        style={{
                                                            height: `${height}%`,
                                                        }}
                                                        className="rounded-t-md bg-blue-100 transition-all duration-500 group-hover/bar:bg-blue-500"
                                                    />
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <p className="text-[10px] font-semibold text-slate-400">
                                        Average wait
                                    </p>

                                    <p className="mt-3 text-2xl font-bold text-slate-900">
                                        12m
                                    </p>

                                    <p className="mt-1 text-[10px] font-semibold text-emerald-600">
                                        ↓ 18% today
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Decorative dots */}

                <div className="pointer-events-none absolute -bottom-8 -right-8 grid grid-cols-5 gap-2 opacity-40">
                    {Array.from({ length: 25 }).map((_, index) => (
                        <span
                            key={index}
                            className="h-1 w-1 rounded-full bg-blue-400"
                        />
                    ))}
                </div>
            </div>
        </div>

        {/* Scroll indicator */}

        <a
            href="#journey"
            className="group absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-slate-400 transition hover:text-blue-600 lg:flex"
        >
            <span className="text-[10px] font-bold uppercase tracking-[0.25em]">
                Scroll to explore
            </span>

            <span className="flex h-9 w-9 animate-bounce items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                <ArrowDown size={15} />
            </span>
        </a>
    </section>

    {/* ============================================================
          INDIA / MARQUEE
      ============================================================ */}

    <section
        id="journey"
       className="relative z-10 overflow-hidden border-y border-slate-100 bg-white/40 py-24"
    >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="cf-reveal text-center">
                <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-2.5 shadow-sm">
                    <span className="text-2xl">🇮🇳</span>

                    <span className="text-sm font-bold text-slate-800">
                        Starting in India
                    </span>
                </div>

                <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
                    Run the clinic.
                    <span className="block text-blue-600">
                        Not the chaos.
                    </span>
                </h2>

                <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">
                    ClinicFlow starts here in India, with a simple mission:
                    make everyday clinic operations easier.
                </p>
            </div>

            {/* Marquee */}

            <div className="cf-reveal reveal-up relative mt-16 overflow-hidden">
                <div className="pointer-events-none absolute left-0 top-0 z-20 h-full w-32 bg-gradient-to-r from-slate-50 via-slate-50/80 to-transparent" />

                <div className="pointer-events-none absolute right-0 top-0 z-20 h-full w-32 bg-gradient-to-l from-slate-50 via-slate-50/80 to-transparent" />

                <div className="clinic-marquee flex w-max gap-4">
                    {[...clinics, ...clinics].map(
                        (clinic, index) => (
                            <div
                                key={`${clinic}-${index}`}
                                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5"
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 transition duration-300 group-hover:bg-blue-600">
                                    <HeartPulse
                                        size={17}
                                        className="text-blue-600 transition duration-300 group-hover:text-white"
                                    />
                                </div>

                                <span className="whitespace-nowrap text-sm font-bold text-slate-700">
                                    {clinic}
                                </span>
                            </div>
                        )
                    )}
                </div>
            </div>

            <div className="cf-reveal mt-10 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                    Building the future of clinic management
                </p>
            </div>
        </div>
    </section>

    {/* ============================================================
          GLOBAL EXPANSION
      ============================================================ */}

    <section
        id="about"
        className="relative z-10 overflow-hidden bg-white py-28"
    >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid items-center gap-16 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="cf-reveal reveal-left">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
                        The journey ahead
                    </p>

                    <h2 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                        Start local.
                        <span className="block text-blue-600">
                            Think global.
                        </span>
                    </h2>

                    <p className="mt-6 max-w-xl text-base leading-7 text-slate-600">
                        India is where ClinicFlow begins. As we grow, our vision is
                        to take a simple, connected clinic experience to healthcare
                        teams around the world.
                    </p>

                    <div className="mt-9 flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <Activity size={21} />
                        </div>

                        <div>
                            <p className="text-sm font-bold">
                                Built to grow
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                One platform, many possibilities.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Countries */}

                <div className="cf-reveal reveal-right relative">
                    <div className="absolute left-[12%] right-[12%] top-1/2 hidden h-px bg-slate-200 sm:block" />

                    <div className="relative grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {countries.map(
                            (country, index) => (
                                <div
                                    key={country.name}
                                    className={`country-card group relative ${country.active
                                        ? "border-blue-200 shadow-lg shadow-blue-600/10"
                                        : "border-slate-200"
                                        }`}
                                    style={{
                                        animationDelay: `${index * 120}ms`,
                                    }}
                                >
                                    <div className="country-flag mx-auto">
                                        {country.flag}
                                    </div>

                                    <p className="mt-4 text-sm font-bold text-slate-900">
                                        {country.name}
                                    </p>

                                    <p
                                        className={`mt-1 text-xs ${country.active
                                            ? "font-semibold text-blue-600"
                                            : "text-slate-400"
                                            }`}
                                    >
                                        {country.status}
                                    </p>

                                    {country.active && (
                                        <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
                                            <Check size={13} />
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    </section>

    {/* ============================================================
          FEATURES
      ============================================================ */}

    <section
        id="features"
        className="relative z-10 bg-transparent py-28"
    >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="cf-reveal mx-auto max-w-2xl text-center">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
                    One workspace
                </p>

                <h2 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
                    Everything your clinic needs.
                </h2>

                <p className="mt-5 leading-7 text-slate-600">
                    Designed around the everyday work your team already does.
                </p>
            </div>

            <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <FeatureCard
                    delay="0ms"
                    icon={<Users size={21} />}
                    title="Patient management"
                    description="Keep patient information organized and accessible to the right people."
                />

                <FeatureCard
                    delay="100ms"
                    icon={<CalendarDays size={21} />}
                    title="Appointments"
                    description="Keep schedules organized and make the day's appointments easy to follow."
                />

                <FeatureCard
                    delay="200ms"
                    icon={<Clock3 size={21} />}
                    title="Queue management"
                    description="See who is waiting, who is next and how your clinic is flowing."
                />

                <FeatureCard
                    delay="300ms"
                    icon={<ShieldCheck size={21} />}
                    title="Clinic workspace"
                    description="Give your team a structured workspace with clear roles and access."
                />

                <FeatureCard
                    delay="400ms"
                    icon={<Activity size={21} />}
                    title="Clinic insights"
                    description="Understand the numbers that matter across your everyday clinic operations."
                />

                <FeatureCard
                    delay="500ms"
                    icon={<HeartPulse size={21} />}
                    title="Built for healthcare"
                    description="A workflow designed around clinics rather than generic business software."
                />
            </div>
        </div>
    </section>

    {/* ============================================================
          HOW IT WORKS
      ============================================================ */}

    <section
        id="how-it-works"
        className="relative z-10 overflow-hidden bg-white py-28"
    >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
                <div className="cf-reveal reveal-left">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
                        How it works
                    </p>

                    <h2 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
                        Simple for your team.
                        <span className="block text-blue-600">
                            Powerful for your clinic.
                        </span>
                    </h2>

                    <p className="mt-6 max-w-xl leading-7 text-slate-600">
                        ClinicFlow keeps the complicated parts behind the scenes,
                        so your team can focus on keeping the clinic moving.
                    </p>

                    <a
                        href="/login"
                        className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/15 transition duration-300 hover:-translate-y-1 hover:bg-blue-700"
                    >
                        Let's onboard
                        <ArrowRight
                            size={17}
                            className="transition-transform group-hover:translate-x-1"
                        />
                    </a>
                </div>

                <div className="space-y-4">
                    <Step
                        number="01"
                        title="Create your clinic"
                        description="Set up your clinic workspace and configure the essentials."
                        delay="0ms"
                    />

                    <Step
                        number="02"
                        title="Bring your team"
                        description="Invite doctors, receptionists and staff with the right access."
                        delay="120ms"
                    />

                    <Step
                        number="03"
                        title="Start running"
                        description="Manage patients, appointments, queues and everyday operations."
                        delay="240ms"
                    />
                </div>
            </div>
        </div>
    </section>

    {/* ============================================================
          FINAL CTA
      ============================================================ */}

    <section className="clinic-final-cta relative z-10 px-6 pb-10 lg:px-8">
        <div className="cta-section relative mx-auto max-w-7xl overflow-hidden rounded-[34px] bg-blue-600 px-8 py-20 text-center text-white shadow-2xl shadow-blue-600/20 sm:px-12 lg:py-24">
            <div className="cta-orb absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

            <div className="cta-orb-delay absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />

            <div className="relative mx-auto max-w-3xl">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <Activity size={27} />
                </div>

                <h2 className="mt-7 text-4xl font-bold tracking-tight sm:text-5xl">
                    Ready to bring order to your clinic?
                </h2>

                <p className="mx-auto mt-5 max-w-2xl leading-7 text-blue-100 sm:text-lg">
                    Start your ClinicFlow journey and give your team a simpler way
                    to manage the day.
                </p>

                <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                    <a
                        href="/login"
                        className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-blue-600 shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
                    >
                        Let's onboard
                        <ArrowRight
                            size={17}
                            className="transition-transform group-hover:translate-x-1"
                        />
                    </a>

                    <a
                        href="/"
                        className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                    >
                        Sign in
                    </a>
                </div>
            </div>
        </div>
    </section>

    {/* ============================================================
          FOOTER
      ============================================================ */}

    <footer className="relative z-10 border-t border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <a
                href="/landing"
                className="flex items-center gap-3"
            >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <Activity size={18} />
                </div>

                <span className="font-bold tracking-tight">
                    <span className="text-blue-600">Clinic</span>Flow
                </span>
            </a>

            <p className="text-sm text-slate-400">
                © {new Date().getFullYear()} ClinicFlow.
            </p>

            <div className="flex items-center gap-5 text-sm text-slate-200">
                <a
                    href="#features"
                    className="transition hover:text-blue-300"
                >
                    Features
                </a>

                <a
                    href="#about"
                    className="transition hover:text-blue-300"
                >
                    About
                </a>

                <a
                    href="/"
                    className="transition hover:text-blue-300"
                >
                    Sign in
                </a>
            </div>
        </div>
    </footer>

    {/* ============================================================
          PAGE STYLES
      ============================================================ */}

    <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        .nav-link {
          position: relative;
          font-size: 0.875rem;
          font-weight: 600;
          color: rgb(71 85 105);
          transition:
            color 250ms ease,
            transform 250ms ease;
        }

        .nav-link:hover {
          color: rgb(37 99 235);
          transform: translateY(-1px);
        }

        .nav-link::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: -7px;
          height: 2px;
          width: 0;
          border-radius: 999px;
          background: rgb(37 99 235);
          transition: width 250ms ease;
        }

        .nav-link:hover::after {
          width: 100%;
        }

        .gradient-text {
          background: linear-gradient(
            110deg,
            rgb(37 99 235),
            rgb(59 130 246),
            rgb(14 165 233)
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: gradientMove 5s ease-in-out infinite;
        }

        .hero-grid {
          background-image:
            linear-gradient(
              rgba(59, 130, 246, 0.045) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(59, 130, 246, 0.045) 1px,
              transparent 1px
            );
          background-size: 55px 55px;
          mask-image: linear-gradient(
            to bottom,
            black,
            transparent 75%
          );
        }

        .dashboard-float {
          animation: dashboardFloat 6s ease-in-out infinite;
        }

        .float-card {
          animation: floatingCard 4.5s ease-in-out infinite;
        }

        .float-card-delay {
          animation: floatingCard 5.5s ease-in-out 0.7s infinite;
        }

        .clinic-marquee {
          animation: clinicMarquee 32s linear infinite;
          will-change: transform;
        }

        .clinic-marquee:hover {
          animation-play-state: paused;
        }

        .country-card {
          position: relative;
          border-radius: 1.25rem;
          background: white;
          border-width: 1px;
          padding: 1.25rem;
          text-align: center;
          box-shadow:
            0 4px 15px rgba(15, 23, 42, 0.04);
          transition:
            transform 350ms ease,
            box-shadow 350ms ease,
            border-color 350ms ease;
        }

        .country-card:hover {
          transform: translateY(-9px) scale(1.02);
          border-color: rgb(191 219 254);
          box-shadow:
            0 25px 45px rgba(15, 23, 42, 0.1);
        }

        .country-flag {
          display: flex;
          height: 58px;
          width: 58px;
          align-items: center;
          justify-content: center;
          border-radius: 1rem;
          background: rgb(248 250 252);
          font-size: 2rem;
          transition:
            transform 350ms ease,
            background 350ms ease;
        }

        .country-card:hover .country-flag {
          transform: scale(1.12) rotate(-3deg);
          background: rgb(239 246 255);
        }

        .cf-reveal {
          opacity: 0;
          transform: translateY(45px);
          transition:
            opacity 900ms cubic-bezier(0.2, 0.7, 0.2, 1),
            transform 900ms cubic-bezier(0.2, 0.7, 0.2, 1);
        }

        .cf-reveal.reveal-left {
          transform: translateX(-60px);
        }

        .cf-reveal.reveal-right {
          transform: translateX(60px);
        }

        .cf-reveal.is-visible {
          opacity: 1;
          transform: translate(0, 0);
        }

        .cta-section {
          isolation: isolate;
        }

        .cta-orb {
          animation: ctaOrb 8s ease-in-out infinite;
        }

        .cta-orb-delay {
          animation: ctaOrb 10s ease-in-out 1s infinite reverse;
        }

        @keyframes clinicMarquee {
          from {
            transform: translateX(0);
          }

          to {
            transform: translateX(-50%);
          }
        }

        @keyframes dashboardFloat {
          0%,
          100% {
            transform: translateY(0) rotateX(0deg);
          }

          50% {
            transform: translateY(-10px) rotateX(0.5deg);
          }
        }

        @keyframes floatingCard {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes gradientMove {
          0%,
          100% {
            background-position: 0% 50%;
          }

          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes pulseGlow {
          0%,
          100% {
            opacity: 0.35;
            transform: scale(1);
          }

          50% {
            opacity: 0.65;
            transform: scale(1.12);
          }
        }

        @keyframes orbOne {
          0%,
          100% {
            transform: translate(0, 0);
          }

          50% {
            transform: translate(100px, -50px);
          }
        }

        @keyframes orbTwo {
          0%,
          100% {
            transform: translate(0, 0);
          }

          50% {
            transform: translate(-90px, 70px);
          }
        }

        @keyframes ctaOrb {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }

          50% {
            transform: translate(30px, 20px) scale(1.12);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }

          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }

          .cf-reveal {
            opacity: 1;
            transform: none !important;
          }
        }

        @media (max-width: 640px) {
          .clinic-marquee {
            animation-duration: 24s;
          }
        }
      `}</style>
        </main >
    );
}

/* ================================================================
   SMALL COMPONENTS
================================================================ */

function TrustItem({ icon, text }) {
    return (
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <span className="text-blue-600">
                {icon}
            </span>

            {text}
        </div>
    );
}

function DashboardStat({
    icon,
    label,
    value,
    detail,
}) {
    return (
        <div className="group rounded-2xl border border-slate-200 bg-white p-3 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
            <div className="flex items-center gap-1.5 text-slate-400">
                <span className="text-blue-600">
                    {icon}
                </span>

                <p className="text-[9px] font-semibold">
                    {label}
                </p>
            </div>

            <p className="mt-2 text-xl font-bold tracking-tight text-slate-900">
                {value}
            </p>

            <p className="mt-1 text-[9px] font-semibold text-blue-600">
                {detail}
            </p>
        </div>
    );
}

function QueueItem({
    number,
    name,
    status,
    active = false,
}) {
    return (
        <div className="group flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 transition duration-300 hover:bg-blue-50">
            <div className="flex min-w-0 items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400">
                    {number}.
                </span>

                <span className="truncate text-xs font-semibold text-slate-800">
                    {name}
                </span>
            </div>

            <span
                className={`ml-2 shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold ${active
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-blue-50 text-blue-700"
                    }`}
            >
                {status}
            </span>
        </div>
    );
}

function FeatureCard({
    icon,
    title,
    description,
    delay,
}) {
    return (
        <div
            className="cf-reveal group rounded-2xl border border-slate-200 bg-white p-7 transition duration-500 hover:-translate-y-2 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-900/5"
            style={{
                transitionDelay: delay,
            }}
        >
            <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-blue-50 text-blue-600 transition duration-500 group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-3 group-hover:scale-110">
                {icon}

                <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-700 group-hover:translate-x-full" />
            </div>

            <h3 className="mt-6 text-lg font-bold text-slate-900">
                {title}
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-500">
                {description}
            </p>

            <div className="mt-5 flex items-center gap-1 text-xs font-bold text-blue-600 opacity-0 transition duration-300 group-hover:opacity-100">
                Explore
                <ArrowRight
                    size={13}
                    className="transition-transform group-hover:translate-x-1"
                />
            </div>
        </div>
    );
}

function Step({
    number,
    title,
    description,
    delay,
}) {
    return (
        <div
            className="cf-reveal group flex gap-5 rounded-2xl border border-slate-200 bg-white p-6 transition duration-500 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
            style={{
                transitionDelay: delay,
            }}
        >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-600 transition duration-300 group-hover:bg-blue-600 group-hover:text-white">
                {number}
            </div>

            <div>
                <h3 className="font-bold text-slate-900">
                    {title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                    {description}
                </p>
            </div>
        </div>
    );
}