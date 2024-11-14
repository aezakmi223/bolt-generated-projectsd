import { useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'
import { Button, Container, Typography, Box, CircularProgress, Paper, Alert } from '@mui/material'
import { PhotoCamera } from '@mui/icons-material'

function App() {
  const [isModelLoading, setIsModelLoading] = useState(true)
  const [imageURL, setImageURL] = useState(null)
  const [symmetryScore, setSymmetryScore] = useState(null)
  const [error, setError] = useState(null)
  const imageRef = useRef()
  const canvasRef = useRef()

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models')
      ])
      setIsModelLoading(false)
      setError(null)
    } catch (error) {
      console.error('Error loading models:', error)
      setError('Failed to load face detection models. Please refresh the page.')
      setIsModelLoading(false)
    }
  }

  const calculateSymmetry = async (face) => {
    const landmarks = face.landmarks
    const positions = landmarks.positions

    let totalDifference = 0
    const pairs = [
      [0, 16],
      [1, 15],
      [2, 14],
      [3, 13],
      [4, 12],
      [5, 11],
      [6, 10],
      [7, 9],
      [37, 43],
      [38, 42],
      [39, 41],
      [40, 40],
      [31, 35],
    ]

    pairs.forEach(([left, right]) => {
      const leftPoint = positions[left]
      const rightPoint = positions[right]
      const diff = Math.abs(leftPoint.x - rightPoint.x) + Math.abs(leftPoint.y - rightPoint.y)
      totalDifference += diff
    })

    const maxDifference = 100
    const score = Math.max(0, 100 - (totalDifference / maxDifference * 100))
    return Math.round(score)
  }

  const handleImageUpload = async (e) => {
    try {
      const file = e.target.files[0]
      if (!file) return

      setError(null)
      setSymmetryScore(null)
      
      const url = URL.createObjectURL(file)
      setImageURL(url)

      const img = await faceapi.bufferToImage(file)
      imageRef.current.src = img.src
      
      imageRef.current.onload = async () => {
        try {
          const detections = await faceapi
            .detectAllFaces(imageRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()

          if (detections.length === 0) {
            setError('No face detected in the image. Please try another photo.')
            return
          }

          const score = await calculateSymmetry(detections[0])
          setSymmetryScore(score)

          const canvas = canvasRef.current
          canvas.width = imageRef.current.width
          canvas.height = imageRef.current.height
          const ctx = canvas.getContext('2d')
          faceapi.draw.drawFaceLandmarks(canvas, detections)
        } catch (error) {
          setError('Error processing image. Please try again.')
          console.error('Error:', error)
        }
      }
    } catch (error) {
      setError('Error uploading image. Please try again.')
      console.error('Error:', error)
    }
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h3" gutterBottom>
        Face Symmetry Analyzer
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isModelLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', m: 4 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading face detection models...</Typography>
        </Box>
      ) : (
        <>
          <Button
            variant="contained"
            component="label"
            startIcon={<PhotoCamera />}
            sx={{ mb: 4 }}
          >
            Upload Photo
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={handleImageUpload}
            />
          </Button>

          {imageURL && (
            <Paper elevation={3} sx={{ p: 2, mb: 4 }}>
              <div className="canvas-wrapper" style={{ width: 'fit-content', margin: '0 auto' }}>
                <img
                  ref={imageRef}
                  src={imageURL}
                  alt="Uploaded face"
                  style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                />
                <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
              </div>

              {symmetryScore !== null && (
                <Typography variant="h4" sx={{ mt: 2 }}>
                  Symmetry Score: {symmetryScore}%
                </Typography>
              )}
            </Paper>
          )}
        </>
      )}
    </Container>
  )
}

export default App
