"use client"
import { useEffect, useRef, useState, useCallback } from "react"

const ARViewer = () => {
  const [arScriptsLoaded, setArScriptsLoaded] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const interactionCountRef = useRef(0)
  const sceneRef = useRef(null)
  const mainImageRef = useRef(null) // Ref for a-image element

  // Function to adjust image aspect ratio
  const adjustImageAspectRatio = useCallback((imgElement, targetElement) => {
    try {
      let naturalWidth = 0
      let naturalHeight = 0
      if (imgElement instanceof HTMLImageElement) {
        if (!imgElement.complete || imgElement.naturalHeight === 0) {
          return false
        }
        naturalWidth = imgElement.naturalWidth
        naturalHeight = imgElement.naturalHeight
      } else if (imgElement instanceof SVGElement) {
        const viewBox = imgElement.viewBox.baseVal
        if (viewBox.width === 0 || viewBox.height === 0) {
          return false
        }
        naturalWidth = viewBox.width
        naturalHeight = viewBox.height
      } else {
        return false
      }
      const aspectRatio = naturalHeight / naturalWidth
      const width = Number.parseFloat(targetElement.getAttribute("width")) || 0.8
      targetElement.setAttribute("height", (width * aspectRatio).toString())
      return true
    } catch (e) {
      console.error("Error adjusting image aspect ratio:", e)
      return false
    }
  }, [])

  // Function to handle successful image loading in A-Frame
  const handleImageSuccess = useCallback(() => {
    setImageLoaded(true)
    const image = mainImageRef.current
    if (image && image.object3D && image.object3D.children[0]) {
      const material = image.object3D.children[0].material
      material.transparent = true
      material.alphaTest = 0.05
      material.needsUpdate = true
      image.setAttribute(
        "animation__materialize",
        "property: material.opacity; from: 0; to: 1; dur: 1500; easing: easeOutQuart",
      )
      console.log("Main image texture loaded successfully.")
    }
  }, [])

  // Handle user interactions
  const handleAdvancedInteraction = useCallback(() => {
    interactionCountRef.current++
    const image = mainImageRef.current
    const scene = sceneRef.current
    if (!image || !scene) return

    const hologramContainer = scene.querySelector("#hologramContainer")
    if (!hologramContainer) return

    const effects = [
      () => {
        image.setAttribute(
          "animation__quantum-scale",
          "property: scale; to: 1.15 1.15 1.15; dur: 300; easing: easeOutBack",
        )
        setTimeout(() => {
          image.removeAttribute("animation__quantum-scale")
        }, 300)
      },
      () => {
        const rings = hologramContainer.querySelectorAll("a-ring")
        rings.forEach((ring, index) => {
          setTimeout(() => {
            ring.setAttribute(
              "animation__interaction-pulse",
              "property: scale; to: 1.2 1.2 1.2; dur: 400; dir: alternate; easing: easeOutQuart",
            )
            setTimeout(() => {
              ring.removeAttribute("animation__interaction-pulse")
            }, 800)
          }, index * 100)
        })
      },
    ]
    const randomEffect = effects[Math.floor(Math.random() * effects.length)]
    randomEffect()

    const particles = hologramContainer.querySelector("[particle-system]")
    if (particles) {
      particles.setAttribute("particle-system", "particleCount: 150; size: 0.03, 0.1")
      setTimeout(() => {
        particles.setAttribute("particle-system", "particleCount: 100; size: 0.02, 0.08")
      }, 1500)
    }
  }, [])

  // Apply mobile optimizations
  const applyMobileOptimizations = useCallback(() => {
    const isMobile = /Android|webOS|iPhone|iPad|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const scene = sceneRef.current
    if (!scene) return

    const hologramContainer = scene.querySelector("#hologramContainer")
    if (isMobile) {
      hologramContainer?.setAttribute("scale", "0.8 0.8 0.8")
      const particles = hologramContainer?.querySelector("[particle-system]")
      if (particles) {
        particles.setAttribute("particle-system", "particleCount: 70; size: 0.02, 0.06")
      }
    } else {
      hologramContainer?.setAttribute("scale", "1 1 1")
    }
  }, [])

  // Effect to load A-Frame and AR.js scripts
  useEffect(() => {
    const loadScript = (src, id) => {
      return new Promise((resolve, reject) => {
        if (document.getElementById(id)) {
          resolve()
          return
        }
        const script = document.createElement("script")
        script.src = src
        script.id = id
        script.async = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
        document.head.appendChild(script)
      })
    }

    const loadAllScripts = async () => {
      try {
        await loadScript("https://aframe.io/releases/1.4.0/aframe.min.js", "aframe-script")
        await loadScript(
          "https://cdn.jsdelivr.net/gh/donmccurdy/aframe-extras@v6.1.1/dist/aframe-extras.min.js",
          "aframe-extras-script",
        )
        await loadScript("https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js", "arjs-script")
        setArScriptsLoaded(true)
        console.log("All AR.js scripts loaded.")
      } catch (error) {
        console.error("Failed to load AR scripts:", error)
      }
    }

    loadAllScripts()
  }, []) // Runs once on mount

  // Effect to initialize the AR experience once scripts are loaded and scene is rendered
  useEffect(() => {
    if (!arScriptsLoaded || !sceneRef.current) {
      return
    }

    const scene = sceneRef.current

    const initializeScene = () => {
      try {
        console.log("A-Frame scene loaded event fired.")
        const imgTexture = document.getElementById("mainTexture")
        const mainImage = mainImageRef.current

        if (imgTexture && mainImage) {
          // Try to adjust aspect ratio immediately if image is already complete
          if (!adjustImageAspectRatio(imgTexture, mainImage)) {
            // If not complete, set the onload handler
            imgTexture.onload = () => {
              adjustImageAspectRatio(imgTexture, mainImage)
              // If the image loads correctly, ensure imageLoaded is true
              setImageLoaded(true)
              console.log("Main texture image loaded via onload.")
            }
          } else {
            // If the image was already complete, set imageLoaded to true
            setImageLoaded(true)
            console.log("Main texture image already complete on scene load.")
          }
        }

        const loadingScreen = document.getElementById("loadingScreen")
        const hudPanel = document.getElementById("hudPanel")
        if (loadingScreen && hudPanel) {
          setTimeout(() => {
            loadingScreen.style.opacity = "0"
            setTimeout(() => {
              loadingScreen.style.display = "none"
              hudPanel.style.opacity = "1"
            }, 1000)
          }, 2500)
        }

        applyMobileOptimizations()

        // Attach event listeners to the a-image element
        if (mainImage) {
          mainImage.addEventListener("materialtextureloaded", handleImageSuccess)
          mainImage.addEventListener("click", handleAdvancedInteraction)
          mainImage.addEventListener("touchstart", handleAdvancedInteraction)
        }

        return () => {
          // Clean up event listeners
          if (mainImage) {
            mainImage.removeEventListener("materialtextureloaded", handleImageSuccess)
            mainImage.removeEventListener("click", handleAdvancedInteraction)
            mainImage.removeEventListener("touchstart", handleAdvancedInteraction)
          }
        }
      } catch (error) {
        console.error("Error during A-Frame scene initialization:", error)
      }
    }

    // Listen for the 'loaded' event of the A-Frame scene
    scene.addEventListener("loaded", initializeScene, { once: true })

    // If the scene is already loaded (e.g., in a re-render after scripts are ready), call initializeScene directly
    if (scene.hasLoaded) {
      initializeScene()
    }

    // Cleanup for the scene loaded listener
    return () => {
      scene.removeEventListener("loaded", initializeScene)
    }
  }, [
    arScriptsLoaded,
    adjustImageAspectRatio,
    handleImageSuccess,
    handleAdvancedInteraction,
    applyMobileOptimizations,
    imageLoaded,
  ])

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      {/* Overlay and visual effects */}
      <div className="camera-overlay"></div>
      <div className="particles"></div>

      {/* Loading screen */}
      <div id="loadingScreen" className="loading-screen">
        <div className="quantum-loader">
          <div className="loader-ring"></div>
          <div className="loader-ring"></div>
          <div className="loader-ring"></div>
        </div>
        <div className="loading-title">HOLOGRAM SYSTEM</div>
        <div className="loading-subtitle">Initializing quantum interface...</div>
      </div>

      {/* AR HUD */}
      <div className="ar-hud">
        <div id="hudPanel" className="hud-panel">
          <div className="status-indicator">
            <div className="pulse-dot"></div>
            <span>AR EXPERIENCE ACTIVE</span>
          </div>
          <div className="hud-instructions">
            Focus on a flat surface
            <br />
            Tap to interact with hologram
          </div>
        </div>
        <div className="corner-ui top-left"></div>
        <div className="corner-ui top-right"></div>
        <div className="corner-ui bottom-left"></div>
        <div className="corner-ui bottom-right"></div>
      </div>

      {/* A-Frame Scene - Render only if scripts are loaded */}
      {arScriptsLoaded && (
        <a-scene
          ref={sceneRef}
          vr-mode-ui="enabled: false"
          renderer="logarithmicDepthBuffer: true; alpha: true; precision: high; antialias: true"
          arjs="sourceType: webcam; debugUIEnabled: false; detectionMode: mono_and_matrix; matrixCodeType: 3x3; cameraParametersUrl: https://raw.githubusercontent.com/jeromeetienne/ar.js/master/data/data/camera_para.dat; facingMode: environment"
          embedded
          device-orientation-permission-ui
        >
          <a-assets>
            {/* Main image texture - Updated to use the provided image */}
            <img id="mainTexture" src="/images/hologram-image.png" crossOrigin="anonymous" alt="Hologram main image" />
          </a-assets>

          {/* Hologram container */}
          <a-entity id="hologramContainer" position="0 0 -1.5" class="interactive">
            {/* Main image */}
            <a-image
              ref={mainImageRef}
              id="mainImage"
              src="#mainTexture"
              transparent="true"
              alpha-test="0.05"
              position="0 0.2 0"
              width="0.8"
              height="auto"
              // Added a default color to prevent white background if texture fails
              material="color: #0a192f; transparent: true; alphaTest: 0.05; side: double; shader: flat"
              animation__float="property: position; to: 0 0.28 0; dir: alternate; loop: true; dur: 4000; easing: easeInOutSine"
              animation__pulse="property: scale; to: 1.05 1.05 1.05; dir: alternate; loop: true; dur: 2500; easing: easeInOutQuad"
            ></a-image>

            {/* Holographic rings */}
            <a-ring
              position="0 0.2 0"
              radius-inner="0.5"
              radius-outer="0.55"
              color="#00c8ff"
              material="transparent: true; opacity: 0.8; side: double; shader: flat"
              rotation="-90 0 0"
              animation__glow="property: material.opacity; to: 1.0; dir: alternate; loop: true; dur: 2000; easing: easeInOutSine"
              animation__spin="property: rotation; to: -90 360 0; loop: true; dur: 15000; easing: linear"
            ></a-ring>
            <a-ring
              position="0 0.2 0"
              radius-inner="0.65"
              radius-outer="0.7"
              color="#ffffff"
              material="transparent: true; opacity: 0.4; side: double"
              rotation="-90 0 0"
              animation__glow2="property: material.opacity; to: 0.7; dir: alternate; loop: true; dur: 2500; easing: easeInOutSine"
              animation__spin2="property: rotation; to: -90 -360 0; loop: true; dur: 10000; easing: linear"
            ></a-ring>
            <a-ring
              position="0 0.2 0"
              radius-inner="0.4"
              radius-outer="0.45"
              color="#0088ff"
              material="transparent: true; opacity: 0.6; side: double"
              rotation="-90 0 0"
              animation__pulse="property: scale; to: 1.2 1.2 1.2; dir: alternate; loop: true; dur: 1800; easing: easeInOutQuad"
              animation__spin3="property: rotation; to: -90 720 0; loop: true; dur: 8000; easing: linear"
            ></a-ring>

            {/* Particle effects */}
            <a-entity
              particle-system="preset: snow; color: #00c8ff, #ffffff, #0088ff; particleCount: 100; size: 0.02, 0.08; maxAge: 12; accelerationValue: 0 -0.01 0; velocityValue: 0 0 0; accelerationSpread: 0.4 0 0.4; velocitySpread: 0.15 0.15 0.15; opacity: 0.9; blending: additive"
              position="0 0.2 0"
            ></a-entity>

            {/* Base light effect */}
            <a-entity
              geometry="primitive: ring; radiusInner: 0.8; radiusOuter: 0.85"
              material="color:rgba(0, 200, 255, 0.2); transparent: true; opacity: 0.15; side: double; shader: flat"
              position="0 0.2 -0.01"
              rotation="-90 0 0"
              animation__expand="property: scale; to: 1.3 1.3 1.3; dir: alternate; loop: true; dur: 3000; easing: easeInOutSine"
            ></a-entity>
          </a-entity>

          {/* Lighting system */}
          <a-entity light="type: ambient; color: #1a1a2e; intensity: 0.8"></a-entity>
          <a-entity
            light="type: directional; color: #ffffff; intensity: 1.5; castShadow: false"
            position="2 4 1"
          ></a-entity>
          {/* Accent lights */}
          <a-entity
            light="type: point; color: #00c8ff; intensity: 1.5; distance: 5; decay: 2"
            position="1 1 -1.5"
            animation__pulse="property: light.intensity; to: 2.0; dir: alternate; loop: true; dur: 2000; easing: easeInOutSine"
          ></a-entity>
          <a-entity
            light="type: point; color: #0088ff; intensity: 1.0; distance: 4; decay: 2"
            position="-1 1 -1.5"
            animation__pulse2="property: light.intensity; to: 1.5; dir: alternate; loop: true; dur: 2500; easing: easeInOutSine"
          ></a-entity>

          {/* Camera */}
          <a-entity camera look-controls wasd-controls-enabled="false"></a-entity>
        </a-scene>
      )}

      {/* CSS Styles */}
      <style jsx>{`
              @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&family=Orbitron:wght@400;500;700&display=swap');
              * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                  -webkit-tap-highlight-color: transparent;
              }
              body, html {
                  width: 100%;
                  height: 100%;
                  overflow: hidden;
                  touch-action: none;
              }
              .camera-overlay {
                  position: fixed;
                  top: 0;
                  left: 0;
                  width: 100vw;
                  height: 100vh;
                  background: linear-gradient(135deg, rgba(10, 25, 47, 0.4) 0%, rgba(0, 0, 0, 0.3) 100%);
                  z-index: -1;
                  pointer-events: none;
              }
              .particles {
                  position: fixed;
                  top: 0;
                  left: 0;
                  width: 100vw;
                  height: 100vh;
                  background: radial-gradient(2px 2px at 20% 30%, rgba(0, 200, 255, 0.4), transparent),
                              radial-gradient(2px 2px at 80% 70%, rgba(0, 200, 255, 0.4), transparent);
                  background-repeat: repeat;
                  background-size: 200px 200px;
                  animation: particleFlow 40s linear infinite;
                  opacity: 0.6;
                  z-index: -1;
                  pointer-events: none;
                  mix-blend-mode: screen;
              }
              @keyframes particleFlow {
                  0% { background-position: 0 0; }
                  100% { background-position: 200px 200px; }
              }
              a-scene {
                  width: 100vw !important;
                  height: 100vh !important;
                  display: block;
                  position: fixed;
                  top: 0;
                  left: 0;
                  background: transparent !important;
              }
              .ar-hud {
                  position: fixed;
                  top: 0;
                  left: 0;
                  width: 100vw;
                  height: 100vh;
                  pointer-events: none;
                  z-index: 1000;
              }
              .hud-panel {
                  position: absolute;
                  top: 25px;
                  left: 50%;
                  transform: translateX(-50%);
                  background: rgba(10, 25, 47, 0.7);
                  border-radius: 24px;
                  padding: 14px 28px;
                  backdrop-filter: blur(12px);
                  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
                  color: #ffffff;
                  text-align: center;
                  font-weight: 500;
                  letter-spacing: 0.5px;
                  font-size: 15px;
                  opacity: 0;
                  transition: opacity 0.8s ease;
                  border: 1px solid rgba(0, 200, 255, 0.3);
              }
              .status-indicator {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 12px;
                  margin-bottom: 8px;
              }
              .pulse-dot {
                  width: 10px;
                  height: 10px;
                  background: #00c8ff;
                  border-radius: 50%;
                  box-shadow: 0 0 10px #00c8ff;
                  animation: pulse 2s infinite ease-in-out;
              }
              @keyframes pulse {
                  0%, 100% { transform: scale(1); opacity: 1; }
                  50% { transform: scale(1.3); opacity: 0.8; box-shadow: 0 0 15px #00c8ff; }
              }
              .hud-instructions {
                  font-size: 12px;
                  color: rgba(255, 255, 255, 0.8);
                  line-height: 1.5;
                  font-weight: 400;
                  letter-spacing: 0.3px;
              }
              .corner-ui {
                  position: absolute;
                  width: 60px;
                  height: 60px;
                  border: 1px solid rgba(0, 200, 255, 0.3);
                  pointer-events: none;
              }
              .corner-ui.top-left {
                  top: 20px;
                  left: 20px;
                  border-right: none;
                  border-bottom: none;
                  border-radius: 12px 0 0 0;
              }
              .corner-ui.top-right {
                  top: 20px;
                  right: 20px;
                  border-left: none;
                  border-bottom: none;
                  border-radius: 0 12px 0 0;
              }
              .corner-ui.bottom-left {
                  bottom: 20px;
                  left: 20px;
                  border-right: none;
                  border-top: none;
                  border-radius: 0 0 0 12px;
              }
              .corner-ui.bottom-right {
                  bottom: 20px;
                  right: 20px;
                  border-left: none;
                  border-top: none;
                  border-radius: 0 0 12px 0;
              }
              .loading-screen {
                  position: fixed;
                  top: 0;
                  left: 0;
                  width: 100vw;
                  height: 100vh;
                  background: rgba(10, 15, 25, 0.98);
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  color: #ffffff;
                  z-index: 2000;
                  transition: opacity 1.2s ease;
                  backdrop-filter: blur(5px);
              }
              .quantum-loader {
                  position: relative;
                  width: 100px;
                  height: 100px;
                  margin-bottom: 30px;
              }
              .loader-ring {
                  position: absolute;
                  border: 2px solid transparent;
                  border-radius: 50%;
                  animation: spin 2s linear infinite;
              }
              .loader-ring:nth-child(1) {
                  width: 100px;
                  height: 100px;
                  border-top: 2px solid #00c8ff;
                  border-right: 2px solid #00c8ff;
              }
              .loader-ring:nth-child(2) {
                  width: 75px;
                  height: 75px;
                  top: 12.5px;
                  left: 12.5px;
                  border-bottom: 2px solid #0088ff;
                  border-left: 2px solid #0088ff;
                  animation-direction: reverse;
              }
              .loader-ring:nth-child(3) {
                  width: 50px;
                  height: 50px;
                  top: 25px;
                  left: 25px;
                  border-top: 2px solid #ffffff;
                  border-right: 2px solid #ffffff;
              }
              @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
              }
              .loading-title {
                  font-size: 24px;
                  font-weight: 600;
                  margin-bottom: 12px;
                  background: linear-gradient(90deg, #00c8ff, #ffffff, #00c8ff);
                  background-size: 200% auto;
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  background-clip: text;
                  animation: gradientShift 3s linear infinite;
                  font-family: 'Orbitron', sans-serif;
              }
              .loading-subtitle {
                  font-size: 14px;
                  opacity: 0.7;
                  font-weight: 400;
                  animation: fadeInOut 2s ease-in-out infinite alternate;
              }
              @keyframes gradientShift {
                  0% { background-position: 0% center; }
                  100% { background-position: 200% center; }
              }
              @keyframes fadeInOut {
                  from { opacity: 0.6; }
                  to { opacity: 0.9; }
              }
              @media (max-width: 768px) {
                  .hud-panel {
                      top: 20px;
                      padding: 12px 20px;
                      max-width: 90%;
                      font-size: 14px;
                  }
                  .hud-instructions {
                      font-size: 11px;
                  }
                  .corner-ui {
                      width: 50px;
                      height: 50px;
                  }
                  .loading-title {
                      font-size: 22px;
                  }
                  .quantum-loader {
                      width: 80px;
                      height: 80px;
                      margin-bottom: 25px;
                  }
                  .loader-ring:nth-child(1) { width: 80px; height: 80px; }
                  .loader-ring:nth-child(2) { width: 60px; height: 60px; top: 10px; left: 10px; }
                  .loader-ring:nth-child(3) { width: 40px; height: 40px; top: 20px; left: 20px; }
              }
              @media (max-width: 480px) {
                  .hud-panel {
                      top: 15px;
                      padding: 10px 16px;
                      font-size: 13px;
                      border-radius: 18px;
                  }
                  .hud-instructions {
                      font-size: 10px;
                  }
                  .corner-ui {
                      width: 40px;
                      height: 40px;
                  }
                  .loading-title {
                      font-size: 20px;
                  }
              }
          `}</style>
    </div>
  )
}

export default ARViewer
