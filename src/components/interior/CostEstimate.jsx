import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { runCostEstimation } from '../../lib/costEstimator'
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CostEstimate({ base64Image, roomName, backend }) {
  const [estimating, setEstimating] = useState(false)
  const [progress, setProgress] = useState('')
  const [estimate, setEstimate] = useState(null)
  const [expanded, setExpanded] = useState(true)

  async function handleEstimate() {
    if (!base64Image) return toast.error('Upload a room photo first')
    setEstimating(true)
    setEstimate(null)

    const result = await runCostEstimation({
      base64Image,
      roomName,
      backend,
      onProgress: (msg) => setProgress(msg)
    })

    setEstimating(false)
    setProgress('')

    if (result.success) {
      setEstimate(result.estimate)
      toast.success('Estimate ready')
    } else {
      toast.error('Estimation failed: ' + result.error)
    }
  }

  return (
    <div className="border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calculator size={16} />
          <p className="text-sm font-medium">Cost estimation</p>
        </div>
        {estimate && (
          <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        AI identifies materials from photo, searches real Indian market prices via Tavily, calculates estimate with 10% confidence interval
      </p>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleEstimate}
        disabled={estimating || !base64Image}
        className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm disabled:opacity-50 mb-3"
      >
        {estimating ? 'Estimating...' : 'Estimate renovation cost'}
      </motion.button>

      <AnimatePresence>
        {estimating && progress && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground mb-3 flex items-center gap-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-3 h-3 border border-primary border-t-transparent rounded-full shrink-0"
            />
            {progress}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {estimate && expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-primary/10 rounded-xl p-3 mb-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total estimate</p>
              <p className="text-2xl font-semibold">₹{estimate.total?.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                Range: ₹{estimate.total_min?.toLocaleString()} – ₹{estimate.total_max?.toLocaleString()} (±10%)
              </p>
            </div>

            <div className="flex flex-col gap-2 mb-3">
              {estimate.items?.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-muted rounded-lg px-3 py-2"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium capitalize">{item.name}</p>
                    <p className="text-sm font-semibold">₹{item.total?.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} {item.unit} × ₹{item.unit_price?.toLocaleString()}/{item.unit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ₹{item.min?.toLocaleString()} – ₹{item.max?.toLocaleString()}
                    </p>
                  </div>
                  {item.source && (
                    <p className="text-xs text-primary/70 mt-0.5">{item.source}</p>
                  )}
                </motion.div>
              ))}

              {estimate.labor_cost > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 flex justify-between">
                  <p className="text-sm text-amber-700 dark:text-amber-400">Labor (10%)</p>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    ₹{estimate.labor_cost?.toLocaleString()}
                  </p>
                </div>
              )}

              <div className="border-t border-border pt-2 flex justify-between">
                <p className="text-sm font-medium">Total</p>
                <div className="text-right">
                  <p className="text-sm font-semibold">₹{estimate.total?.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    ₹{estimate.total_min?.toLocaleString()} – ₹{estimate.total_max?.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Prices sourced from web search via Tavily · ±10% confidence interval
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
