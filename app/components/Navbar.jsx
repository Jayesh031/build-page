"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Menu,
  X,
  ChevronRight,
  Shield,
  Sun,
  Moon,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";

/* -------------------- THEME TOGGLE -------------------- */
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      onClick={toggleTheme}
      className={`relative w-16 h-8 rounded-full p-1 cursor-pointer transition-colors duration-500 ${
        isDark
          ? "bg-slate-800 border border-slate-700"
          : "bg-sky-200 border border-sky-300"
      }`}
    >
      <motion.div
        className="w-6 h-6 rounded-full shadow-md flex items-center justify-center relative z-10"
        layout
        transition={{ type: "spring", stiffness: 700, damping: 30 }}
        style={{
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          marginLeft: isDark ? "0px" : "32px",
        }}
      >
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              <Moon size={14} className="text-sky-400" fill="currentColor" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ scale: 0, rotate: 90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: -90 }}
              transition={{ duration: 0.2 }}
            >
              <Sun size={14} className="text-orange-500" fill="currentColor" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* -------------------- NAV LINK -------------------- */
function NavLink({ href, label, isDark }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href={href}
      className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        isDark ? "text-slate-300" : "text-slate-600"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        className={`relative z-10 transition-colors duration-200 ${
          isHovered ? (isDark ? "text-white" : "text-slate-900") : ""
        }`}
      >
        {label}
      </span>

      {isHovered && (
        <motion.div
          layoutId="nav-pill"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          className={`absolute inset-0 rounded-full border ${
            isDark
              ? "bg-white/10 border-white/5"
              : "bg-white border-slate-200 shadow-sm"
          }`}
        />
      )}
    </Link>
  );
}

/* -------------------- KNOWLEDGE HUB DROPDOWN -------------------- */
function KnowledgeHubDropdown({ isDark }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const hubOptions = [
    {
      name: "Drone Components",
      href: "/knowledge-hub/components",
      description: "Learn every part of a drone in 3D",
    },
    {
      name: "3D Drones",
      href: "/knowledge-hub/drones",
      description: "Explore Drones in 3D",
    },
  ];

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
          isDark ? "text-slate-300" : "text-slate-600"
        } ${
          isOpen || isHovered ? (isDark ? "text-white " : "text-black") : ""
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="z-10">Knowledge Hub</span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 z-10 ${
            isOpen ? "rotate-180" : ""
          }`}
        />

        {(isOpen || isHovered) && (
          <motion.div
            layoutId="nav-pill"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            className={`absolute inset-0 rounded-full border ${
              isDark
                ? "bg-white/10 border-white/5"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          />
        )}
      </button>

      <AnimatePresence>
        {(isOpen || isHovered) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`absolute top-full left-0 mt-2 w-64 rounded-xl border shadow-lg backdrop-blur-md ${
              isDark
                ? "bg-slate-900/95 border-white/10 shadow-slate-900/50"
                : "bg-white/95 border-slate-200 shadow-slate-400/30"
            }`}
          >
            <div className="p-2">
              {hubOptions.map((option, index) => (
                <motion.div
                  key={option.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    href={option.href}
                    className={`block px-4 py-3 rounded-lg transition-all duration-200 ${
                      isDark
                        ? "text-slate-200 hover:bg-white/10 hover:text-white"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div className="font-medium text-sm">{option.name}</div>
                    <div
                      className={`text-xs mt-1 ${
                        isDark ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {option.description}
                    </div>
                  </Link>

                  {index < hubOptions.length - 1 && (
                    <div
                      className={`mx-4 my-1 h-px ${
                        isDark ? "bg-white/10" : "bg-slate-200"
                      }`}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------- NAVBAR -------------------- */
export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const navLinks = [
    { name: "Home", href: "/" },
    // { name: "Parts", href: "/parts" },
    // { name: "Drones", href: "/drones" },
    { name: "Design Circuits", href: "/design-circuit" },
    { name: "Flight Controllers", href: "/flight-controllers" },
    { name: "Build 3D Drone", href: "/build" },
  ];

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "circOut" }}
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 border-b ${
          isScrolled
            ? isDark
              ? "bg-[#020617]/80 backdrop-blur-md border-sky-900/30 shadow-[0_4px_30px_rgba(14,165,233,0.1)]"
              : "bg-white/80 backdrop-blur-md border-sky-200 shadow-sm"
            : "bg-transparent border-transparent"
        } py-4`}
      >
        <div className="max-w-[1800px] mx-auto px-6 lg:px-12 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 group cursor-pointer"
          >
            <div className="relative flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 shadow-lg p-1 shadow-sky-500/20 group-hover:shadow-sky-500/40 transition-all duration-300">
              <img
                src="/icon.png"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex flex-col">
              <h1
                className={`text-xl font-bold tracking-tight transition-colors ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Simu<span className="text-sky-500">DRONE</span>
              </h1>
              <span className="text-[12px] font-bold font-mono text-sky-500/60 tracking-[0.2em] uppercase">
                System Online
              </span>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div
            className={`hidden lg:flex items-center gap-1 border rounded-full px-2 py-1.5 backdrop-blur-sm transition-colors duration-300 ${
              isDark
                ? "bg-white/5 border-white/5"
                : "bg-slate-100 border-slate-200"
            }`}
          >
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                href={link.href}
                label={link.name}
                isDark={isDark}
              />
            ))}

            {/* NEW Knowledge Hub */}
            <KnowledgeHubDropdown isDark={isDark} />
          </div>

          {/* Right Side */}
          <div className="hidden lg:flex items-center gap-6">
            <ThemeToggle />
            <div
              className={`h-6 w-[1px] ${
                isDark ? "bg-white/10" : "bg-slate-300"
              }`}
            ></div>
            <button
              className={`text-sm font-medium transition-colors ${
                isDark
                  ? "text-slate-300 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Log In
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm shadow-lg shadow-sky-500/25 transition-colors flex items-center gap-2"
            >
              <Shield size={16} />
              Register Pilot
            </motion.button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              isDark
                ? "text-slate-300 hover:bg-white/10"
                : "text-slate-700 hover:bg-slate-100"
            }`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.nav>

      {/* -------------------- MOBILE MENU -------------------- */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "100vh" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={`fixed inset-0 z-40 pt-24 px-6 lg:hidden border-b ${
              isDark
                ? "bg-[#020617] border-sky-900/30"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex flex-col gap-4">
              {/* Settings */}
              <div className="mb-4">
                <span
                  className={`text-xs font-bold uppercase tracking-widest ${
                    isDark ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Settings
                </span>
                <div className="mt-2 flex items-center gap-4">
                  <span className={isDark ? "text-white" : "text-slate-900"}>
                    Theme
                  </span>
                  <ThemeToggle />
                </div>
              </div>

              {/* Menu Links */}
              {navLinks.map((link, idx) => (
                <motion.div
                  key={link.name}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 + idx * 0.1 }}
                >
                  <Link
                    href={link.href}
                    className={`flex items-center justify-between text-2xl font-bold py-4 border-b hover:pl-4 transition-all duration-300 ${
                      isDark
                        ? "text-slate-300 border-white/5 hover:text-sky-400"
                        : "text-slate-700 border-slate-100 hover:text-sky-600"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.name}
                    <ChevronRight size={20} className="text-sky-500" />
                  </Link>
                </motion.div>
              ))}

              {/* NEW KNOWLEDGE HUB (Mobile) */}
              <div className="mt-4">
                <div
                  className={`text-2xl font-bold py-4 border-b ${
                    isDark
                      ? "border-white/5 text-slate-300"
                      : "border-slate-100 text-slate-700"
                  }`}
                >
                  Knowledge Hub
                </div>

                <div className="ml-4 space-y-2">
                  <Link
                    href="/knowledge/components"
                    className={`block py-3 px-4 rounded-lg transition-all duration-200 ${
                      isDark
                        ? "text-slate-300 border border-white/5 hover:bg-white/10 hover:text-sky-400"
                        : "text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-sky-600"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="font-medium">Drone Components</div>
                  </Link>

                  <Link
                    href="/knowledge/3d-drones"
                    className={`block py-3 px-4 rounded-lg transition-all duration-200 ${
                      isDark
                        ? "text-slate-300 border border-white/5 hover:bg-white/10 hover:text-sky-400"
                        : "text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-sky-600"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="font-medium">3D Drones</div>
                  </Link>
                </div>
              </div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 grid grid-cols-2 gap-4"
              >
                <button
                  className={`py-4 rounded-xl font-bold border ${
                    isDark
                      ? "border-white/10 text-slate-300"
                      : "border-slate-200 text-slate-700"
                  }`}
                >
                  Log In
                </button>
                <button className="py-4 rounded-xl bg-sky-600 text-white font-bold shadow-lg shadow-sky-900/50">
                  Register
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
