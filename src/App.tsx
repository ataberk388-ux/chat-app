import { useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { v4 as uuidv4 } from 'uuid'
import type { Conversation, Part, PartCategory } from './types'
import type { AppTab } from './types/tabs'
import { convAdd, convGet } from './lib/localStorage'
import { readBuildFromUrl, clearBuildUrlParam } from './lib/buildShare'
import { useBuild } from './hooks/useBuild'
import { LandingScreen } from './components/Landing/LandingScreen'
import { Header } from './components/Header/Header'
import { ChatPanel } from './components/Chat/ChatPanel'
import { BuildPage } from './components/Pages/BuildPage'
import { PartsPage } from './components/Pages/PartsPage'
import { MyBuildPage } from './components/Pages/MyBuildPage'
import { PresetsPage } from './components/Pages/PresetsPage'

function createConversation(): Conversation {
  return {
    id: uuidv4(),
    title: 'New Build',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

const PAGE_TRANSITION = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: 'easeInOut' },
}

export default function App() {
  const [showLanding, setShowLanding] = useState(true)
  const [activeTab, setActiveTab] = useState<AppTab>('chat')
  const [conversation, setConversation] = useState<Conversation>(() => {
    const saved = convGet()
    return saved[0] ?? createConversation()
  })

  const { build, addPart, removePart, clearBuild, setBuild, totalPrice, totalTdp, recommendedPsu, partCount } = useBuild()

  // Hydrate from a shared ?build=... URL on first load, then open the 3D view.
  useEffect(() => {
    const shared = readBuildFromUrl()
    if (shared) {
      setBuild(shared)
      clearBuildUrlParam()
      setActiveTab('build')
      setShowLanding(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUpdate = useCallback((updated: Conversation) => {
    setConversation(updated)
  }, [])

  const handleAddPart = useCallback((part: Part) => {
    addPart(part)
  }, [addPart])

  const handleRemovePart = useCallback((category: PartCategory) => {
    removePart(category)
  }, [removePart])

  const enterApp = useCallback((tab: AppTab = 'chat') => {
    if (convGet().length === 0) {
      const conv = createConversation()
      convAdd(conv)
      setConversation(conv)
    }
    setActiveTab(tab)
    setShowLanding(false)
  }, [])

  const handleTabChange = useCallback((tab: AppTab) => {
    if (showLanding) {
      enterApp(tab)
    } else {
      setActiveTab(tab)
    }
  }, [showLanding, enterApp])

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <div className="scanline" />

      {/* Header always visible */}
      <Header
        activeTab={showLanding ? null : activeTab}
        onTabChange={handleTabChange}
        partCount={partCount}
        totalPrice={totalPrice}
        onLogoClick={() => setShowLanding(true)}
      />

      {/* Content below header */}
      <div className="flex-1 overflow-hidden mt-14">
        <AnimatePresence mode="wait">
          {showLanding ? (
            <motion.div
              key="landing"
              className="h-full"
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.35 }}
            >
              <LandingScreen onEnter={() => enterApp('chat')} />
            </motion.div>
          ) : (
            <motion.div
              key="main"
              className="h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence mode="wait">
                {activeTab === 'chat' && (
                  <motion.div key="chat" className="h-full max-w-3xl mx-auto" {...PAGE_TRANSITION}>
                    <ChatPanel
                      conversation={conversation}
                      onUpdate={handleUpdate}
                      onAddPart={(part) => {
                        handleAddPart(part)
                        setActiveTab('build')
                      }}
                    />
                  </motion.div>
                )}
                {activeTab === 'build' && (
                  <motion.div key="build" className="h-full" {...PAGE_TRANSITION}>
                    <BuildPage
                      build={build}
                      totalPrice={totalPrice}
                      totalTdp={totalTdp}
                      recommendedPsu={recommendedPsu}
                      onAddPart={handleAddPart}
                      onRemovePart={handleRemovePart}
                      onClear={clearBuild}
                    />
                  </motion.div>
                )}
                {activeTab === 'parts' && (
                  <motion.div key="parts" className="h-full" {...PAGE_TRANSITION}>
                    <PartsPage
                      build={build}
                      onAddPart={handleAddPart}
                      onRemovePart={handleRemovePart}
                    />
                  </motion.div>
                )}
                {activeTab === 'mybuild' && (
                  <motion.div key="mybuild" className="h-full" {...PAGE_TRANSITION}>
                    <MyBuildPage
                      build={build}
                      totalPrice={totalPrice}
                      totalTdp={totalTdp}
                      recommendedPsu={recommendedPsu}
                      onRemovePart={handleRemovePart}
                      onClear={clearBuild}
                      onLoadBuild={setBuild}
                    />
                  </motion.div>
                )}
                {activeTab === 'presets' && (
                  <motion.div key="presets" className="h-full" {...PAGE_TRANSITION}>
                    <PresetsPage
                      currentBuild={build}
                      onLoadPreset={(newBuild) => { setBuild(newBuild) }}
                      onGoToBuild={() => setActiveTab('build')}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
