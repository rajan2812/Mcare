"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, useAnimation, AnimatePresence, useScroll, useTransform } from "framer-motion"
import { useInView } from "react-intersection-observer"
import Modal from "@/components/Modal"
import {
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  CheckCircle,
  Star,
  Users,
  Award,
  ArrowRight,
  Calendar,
  Clock,
  Shield,
} from "lucide-react"


export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false)
  const controls = useAnimation()
  const { scrollYProgress } = useScroll()
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  // Parallax effect for hero section
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  const handleScroll = useCallback(() => {
    if (window.scrollY > 50) {
      setIsScrolled(true)
    } else {
      setIsScrolled(false)
    }
  }, [])

  useEffect(() => {
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  useEffect(() => {
    if (inView) {
      controls.start("visible")
    }
  }, [controls, inView])

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId)
    if (section) {
      section.scrollIntoView({ behavior: "smooth" })
    }
    setIsMenuOpen(false)
  }

  const navItems = [
    { name: "Home", id: "home" },
    { name: "Services", id: "services" },
    { name: "Doctors", id: "doctors" },
    { name: "About", id: "about" },
    { name: "Contact", id: "contact" },
  ]

  return (
    <div className="bg-gradient-to-b from-blue-50 via-white to-purple-50 min-h-screen">
      {/* Decorative background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#D0E8F2] rounded-full blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-[#79A3B1] rounded-full blur-3xl opacity-30 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] bg-[#1F509A] rounded-full blur-3xl opacity-20 -translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 backdrop-blur-lg ${
          isScrolled ? "bg-white/80 shadow-lg" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-row items-center justify-between py-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative">
              <Image
                src="/images/mcareLOGO.png"
                alt="Mcare Logo"
                width={48}
                height={48}
                className="w-10 h-10 md:w-12 md:h-12 transition-transform duration-300 group-hover:scale-110"
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-blue-400 opacity-25"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              />
            </div>
            <span className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent">
              Mcare
            </span>
          </Link>

          <nav className="hidden md:flex space-x-8 flex-grow justify-end">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="relative group text-gray-700 hover:text-blue-600 transition-colors duration-300"
              >
                <span className="relative z-10">{item.name}</span>
                <motion.span
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 origin-left"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center ml-8">
            <Link href="/login">
              <motion.button
                className="relative overflow-hidden bg-gradient-to-r from-[#1F509A] to-[#79A3B1] text-white px-8 py-3 rounded-full group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="relative z-10">Login / Sign Up</span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-[#1F509A] via-[#79A3B1] to-[#D0E8F2]"
                  initial={{ x: "100%" }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.button>
            </Link>
          </div>

          <button
            className="md:hidden text-blue-600 hover:text-blue-800 transition-colors duration-300 ml-4"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <AnimatePresence mode="wait">
              {isMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X size={24} />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu size={24} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              className="md:hidden bg-white/95 backdrop-blur-lg"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <nav className="flex flex-col items-center py-4">
                {navItems.map((item, index) => (
                  <motion.button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className="w-full py-3 px-4 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-300"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {item.name}
                  </motion.button>
                ))}
                <Link href="/login" className="w-full px-4 pt-4">
                  <motion.button
                    className="w-full bg-gradient-to-r from-[#1F509A] to-[#79A3B1] text-white py-3 px-4 rounded-full hover:from-[#1F509A] hover:to-[#79A3B1] transition-colors duration-300"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Login / Sign Up
                  </motion.button>
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="pt-16">
        {/* Hero Section */}
        <section id="home" className="relative min-h-[90vh] flex items-center py-12 overflow-hidden">
          <motion.div style={{ y, opacity }} className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full blur-xl opacity-60" />
            <div className="absolute top-40 right-20 w-32 h-32 bg-purple-200 rounded-full blur-xl opacity-60" />
            <div className="absolute bottom-20 left-1/3 w-40 h-40 bg-teal-200 rounded-full blur-xl opacity-60" />
          </motion.div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <motion.div
                className="flex flex-col md:w-1/2 space-y-6"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="relative">
                  <motion.h1
                    className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight bg-gradient-to-r from-blue-900 via-blue-700 to-blue-500 bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    Discover the Best
                    <br />
                    Healthcare Solution
                  </motion.h1>
                  <motion.div
                    className="absolute -z-10 top-0 left-0 w-40 h-40 bg-blue-200 rounded-full blur-3xl opacity-30"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY }}
                  />
                </div>

                <motion.p
                  className="text-gray-600 text-lg md:text-xl leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Experience healthcare reimagined. Book appointments, consult doctors, and manage your health journey
                  seamlessly with cutting-edge technology and compassionate care.
                </motion.p>

                <motion.div
                  className="grid grid-cols-2 gap-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {[
                    { icon: Calendar, text: "Easy Scheduling" },
                    { icon: Clock, text: "24/7 Support" },
                    { icon: Shield, text: "Secure Platform" },
                    { icon: Users, text: "Expert Doctors" },
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      className="flex items-center space-x-3 group"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="p-2 rounded-lg bg-[#D0E8F2] group-hover:bg-[#79A3B1] transition-colors duration-300">
                        <item.icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-gray-700 font-medium">{item.text}</span>
                    </motion.div>
                  ))}
                </motion.div>

                <motion.div
                  className="flex items-center space-x-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <motion.button
                    className="relative overflow-hidden bg-gradient-to-r from-[#1F509A] to-[#79A3B1] text-white px-8 py-4 rounded-full group"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => scrollToSection("services")}
                  >
                    <span className="relative z-10 flex items-center">
                      Explore Our Services
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-[#1F509A] via-[#79A3B1] to-[#D0E8F2]"
                      initial={{ x: "100%" }}
                      whileHover={{ x: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  </motion.button>

                  <motion.button
                    className="px-8 py-4 text-blue-600 hover:text-blue-700 font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsAboutModalOpen(true)}
                  >
                    Learn More
                  </motion.button>
                </motion.div>
              </motion.div>

              <motion.div
                className="md:w-1/2 relative"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="relative">
                  <motion.div
                    className="absolute -z-10 inset-0 bg-gradient-to-r from-[#D0E8F2] to-[#79A3B1] rounded-3xl"
                    animate={{
                      scale: [1, 1.02, 1],
                      rotate: [0, 1, 0],
                    }}
                    transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY }}
                  />
                  <Image
                    src="/images/website.jpg"
                    alt="Doctor consulting patient"
                    width={700}
                    height={525}
                    className="w-full h-auto rounded-3xl shadow-2xl transform hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>

                <motion.div
                  className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">24/7</p>
                      <p className="text-gray-600">Medical Support</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl shadow-xl"
                  animate={{ y: [0, 10, 0] }}
                  transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2, delay: 1 }}
                >
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-green-500" />
                    <p className="text-sm font-medium text-gray-700">Verified Experts</p>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              ref={ref}
              initial="hidden"
              animate={controls}
              variants={{
                visible: { opacity: 1, y: 0 },
                hidden: { opacity: 0, y: 50 },
              }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">Our Services</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  {
                    icon: "/images/doctor-icon.svg",
                    title: "Expert Doctors",
                    description: "Connect with top specialists in various fields.",
                  },
                  {
                    icon: "/images/telemedicine-icon.svg",
                    title: "Telemedicine",
                    description: "Virtual consultations from the comfort of your home.",
                  },
                  {
                    icon: "/images/prescription-icon.svg",
                    title: "E-Prescriptions",
                    description: "Receive and manage your prescriptions online.",
                  },
                  {
                    icon: "/images/reminder-icon.svg",
                    title: "Health Reminders",
                    description: "Never miss a medication or appointment again.",
                  },
                ].map((service, index) => (
                  <motion.div
                    key={service.title}
                    className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Image
                      src={service.icon || "/placeholder.svg"}
                      alt={service.title}
                      width={64}
                      height={64}
                      className="w-16 h-16 mb-4"
                    />
                    <h3 className="text-xl font-semibold mb-2 text-gray-900">{service.title}</h3>
                    <p className="text-gray-600">{service.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Doctors Section */}
        <section id="doctors" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              ref={ref}
              initial="hidden"
              animate={controls}
              variants={{
                visible: { opacity: 1, y: 0 },
                hidden: { opacity: 0, y: 50 },
              }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">Our Qualified Doctors</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <motion.div
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex items-center justify-center mb-4">
                    <CheckCircle className="w-12 h-12 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-center text-gray-900">Verified Experts</h3>
                  <p className="text-gray-600 text-center">
                    All our doctors are thoroughly vetted and verified to ensure the highest quality of care.
                  </p>
                </motion.div>

                <motion.div
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <div className="flex items-center justify-center mb-4">
                    <Star className="w-12 h-12 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-center text-gray-900">Top-Rated Professionals</h3>
                  <p className="text-gray-600 text-center">
                    Our platform features doctors with outstanding patient reviews and ratings.
                  </p>
                </motion.div>

                <motion.div
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <div className="flex items-center justify-center mb-4">
                    <Users className="w-12 h-12 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-center text-gray-900">Diverse Specialties</h3>
                  <p className="text-gray-600 text-center">
                    Access a wide range of medical specialties to meet all your healthcare needs.
                  </p>
                </motion.div>
              </div>

              <div className="mt-12 bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300">
                <div className="flex flex-col md:flex-row items-center justify-between">
                  <div className="md:w-2/3 mb-6 md:mb-0">
                    <h3 className="text-2xl font-semibold mb-4 text-gray-900">Why Choose Our Doctors?</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center text-gray-700">
                        <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                        Years of experience in their respective fields
                      </li>
                      <li className="flex items-center text-gray-700">
                        <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                        Continuous professional development and training
                      </li>
                      <li className="flex items-center text-gray-700">
                        <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                        Patient-centered approach to healthcare
                      </li>
                      <li className="flex items-center text-gray-700">
                        <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                        Utilization of the latest medical technologies
                      </li>
                    </ul>
                  </div>
                  <div className="md:w-1/3 flex justify-center">
                    <Award className="w-24 h-24 text-blue-600" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              ref={ref}
              initial="hidden"
              animate={controls}
              variants={{
                visible: { opacity: 1, y: 0 },
                hidden: { opacity: 0, y: 50 },
              }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex flex-col md:flex-row items-center gap-12">
                <div className="md:w-1/2">
                  <Image
                    src="/images/about-mcare.jpg"
                    alt="About Mcare"
                    width={600}
                    height={400}
                    className="w-full rounded-2xl shadow-lg mb-6"
                  />
                  <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">About Mcare</h2>
                  <p className="text-gray-600 text-lg mb-6">
                    At Mcare, we are committed to revolutionizing healthcare delivery through innovative technology and
                    compassionate care. Our mission is to make quality healthcare accessible to everyone, anytime,
                    anywhere.
                  </p>
                  <p className="text-gray-600 text-lg mb-6">
                    We envision a world where healthcare is seamlessly integrated into everyday life, empowering
                    individuals to take control of their well-being and live healthier, happier lives.
                  </p>
                  <motion.button
                    className="bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition-colors duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsAboutModalOpen(true)}
                  >
                    Learn More About Us
                  </motion.button>
                </div>
                <div className="md:w-1/2">
                  <Image
                    src="/images/about-team.jpg"
                    alt="Mcare Team"
                    width={600}
                    height={400}
                    className="w-full rounded-2xl shadow-lg"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              ref={ref}
              initial="hidden"
              animate={controls}
              variants={{
                visible: { opacity: 1, y: 0 },
                hidden: { opacity: 0, y: 50 },
              }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">Get in Touch</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <h3 className="text-2xl font-semibold mb-4 text-gray-900">Contact Information</h3>
                  <ul className="space-y-4">
                    <li className="flex items-center text-gray-600">
                      <Phone className="w-6 h-6 mr-2 text-blue-600" />
                      +1 (555) 123-4567
                    </li>
                    <li className="flex items-center text-gray-600">
                      <Mail className="w-6 h-6 mr-2 text-blue-600" />
                      contact@mcare.com
                    </li>
                    <li className="flex items-center text-gray-600">
                      <MapPin className="w-6 h-6 mr-2 text-blue-600" />
                      123 Healthcare Ave, Medical City, HC 12345
                    </li>
                  </ul>
                </div>
                <form className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    ></textarea>
                  </div>
                  <motion.button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition-colors duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Send Message
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">Mcare</h3>
              <p className="text-gray-400">Revolutionizing healthcare through technology and compassion.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => scrollToSection(item.id)}
                      className="text-gray-400 hover:text-white transition-colors duration-300"
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                    Privacy Policy{" "}
                  </a>
                </li>{" "}
                <li>
                  <a href="#" className="textgray-400 hover:text-white transition-colors duration-300">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Follow Us</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                  <Facebook className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                  <Twitter className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                  <Instagram className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                  <Linkedin className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center">
            <p className="text-gray-400">&copy; 2023 Mcare. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <Modal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)}>
        <h2 className="text-2xl font-bold mb-4">About Mcare</h2>
        <p className="mb-4">
          Mcare is at the forefront of digital healthcare innovation. Our platform connects patients with qualified
          healthcare professionals, making quality medical care accessible to everyone, anywhere, at any time.
        </p>
        <p className="mb-4">
          Founded in 2024, Mcare has quickly grown to become a trusted name in telemedicine. We work with a network of
          verified, experienced doctors across various specialties to ensure that our users receive the best possible
          care.
        </p>
        <p className="mb-4">
          Our mission goes beyond just providing medical consultations. We aim to empower individuals to take control of
          their health through education, preventive care, and ongoing support. With Mcare, you are not just a patient -
          you are a partner in your own healthcare journey.
        </p>
        <p>Join us in revolutionizing healthcare delivery and experience the future of medicine today with Mcare.</p>
      </Modal>

      <style jsx global>{`
        @import 'tailwindcss/base';
        @import 'tailwindcss/components';
        @import 'tailwindcss/utilities';

        html, body {
          scroll-padding-top: 5rem;
        }

        body {
          overflow-y: scroll;
          scrollbar-width: thin;
          scrollbar-color: rgba(155, 155, 155, 0.7) transparent;
        }

        body::-webkit-scrollbar {
          width: 8px;
        }

        body::-webkit-scrollbar-track {
          background: transparent;
        }

        body::-webkit-scrollbar-thumb {
          background-color: rgba(155, 155, 155, 0.7);
          border-radius: 20px;
          border: transparent;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 15s ease infinite;
        }

        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  )
}

