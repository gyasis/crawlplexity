import { NextRequest, NextResponse } from 'next/server'
import { CustomModel } from '@/app/types'
import { validateModelIdentifier, sanitizeModelName } from '@/lib/model-storage'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const modelId = url.searchParams.get('id')
    
    if (modelId) {
      const models = await getStoredCustomModels()
      const model = models.find(m => m.id === modelId)
      
      if (!model) {
        return NextResponse.json(
          { error: 'Model not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({ model })
    }
    
    const models = await getStoredCustomModels()
    return NextResponse.json({ 
      models,
      total: models.length 
    })
    
  } catch (error) {
    console.error('Error fetching custom models:', error)
    return NextResponse.json(
      { error: 'Failed to fetch custom models' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const validation = validateCustomModelData(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }
    
    const customModel: Omit<CustomModel, 'id' | 'createdAt' | 'updatedAt'> = {
      name: sanitizeModelName(body.name),
      provider: body.provider.toLowerCase(),
      modelIdentifier: body.modelIdentifier,
      description: body.description || '',
      maxTokens: body.maxTokens || 2048,
      costPer1kTokens: body.costPer1kTokens || 0,
      taskTypes: body.taskTypes || ['general'],
      apiKey: body.apiKey || '',
      apiBase: body.apiBase || '',
      customParams: body.customParams || {}
    }
    
    const savedModel = await saveCustomModelToStorage(customModel)
    
    const validationResult = await validateModelConnection(savedModel)
    if (!validationResult.success) {
      console.warn('Model saved but validation failed:', validationResult.error)
    }
    
    return NextResponse.json({ 
      model: savedModel,
      validation: validationResult
    })
    
  } catch (error) {
    console.error('Error creating custom model:', error)
    return NextResponse.json(
      { error: 'Failed to create custom model' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      )
    }
    
    const validation = validateCustomModelData(updates, true)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }
    
    const sanitizedUpdates = {
      ...updates,
      name: updates.name ? sanitizeModelName(updates.name) : undefined,
      provider: updates.provider ? updates.provider.toLowerCase() : undefined
    }
    
    const updatedModel = await updateCustomModelInStorage(id, sanitizedUpdates)
    
    return NextResponse.json({ model: updatedModel })
    
  } catch (error) {
    console.error('Error updating custom model:', error)
    
    if (error instanceof Error && error.message === 'Model not found') {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update custom model' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const modelId = url.searchParams.get('id')
    
    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      )
    }
    
    await deleteCustomModelFromStorage(modelId)
    
    return NextResponse.json({ 
      success: true,
      message: 'Model deleted successfully' 
    })
    
  } catch (error) {
    console.error('Error deleting custom model:', error)
    return NextResponse.json(
      { error: 'Failed to delete custom model' },
      { status: 500 }
    )
  }
}

function validateCustomModelData(data: any, isUpdate = false): { valid: boolean; error?: string } {
  if (!isUpdate) {
    if (!data.name || typeof data.name !== 'string') {
      return { valid: false, error: 'Name is required and must be a string' }
    }
    
    if (!data.provider || typeof data.provider !== 'string') {
      return { valid: false, error: 'Provider is required and must be a string' }
    }
    
    if (!data.modelIdentifier || typeof data.modelIdentifier !== 'string') {
      return { valid: false, error: 'Model identifier is required and must be a string' }
    }
    
    if (!validateModelIdentifier(data.provider, data.modelIdentifier)) {
      return { valid: false, error: 'Invalid provider or model identifier' }
    }
  }
  
  if (data.maxTokens !== undefined && (typeof data.maxTokens !== 'number' || data.maxTokens <= 0)) {
    return { valid: false, error: 'Max tokens must be a positive number' }
  }
  
  if (data.costPer1kTokens !== undefined && (typeof data.costPer1kTokens !== 'number' || data.costPer1kTokens < 0)) {
    return { valid: false, error: 'Cost per 1k tokens must be a non-negative number' }
  }
  
  if (data.taskTypes !== undefined && (!Array.isArray(data.taskTypes) || data.taskTypes.length === 0)) {
    return { valid: false, error: 'Task types must be a non-empty array' }
  }
  
  return { valid: true }
}

async function validateModelConnection(model: CustomModel): Promise<{ success: boolean; error?: string }> {
  try {
    if (model.provider === 'openai' && model.apiKey) {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 
          'Authorization': `Bearer ${model.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      })
      
      if (!response.ok) {
        return { success: false, error: 'Invalid OpenAI API key' }
      }
    }
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: `Connection validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

async function getStoredCustomModels(): Promise<CustomModel[]> {
  if (typeof window === 'undefined') {
    return []
  }
  
  try {
    const stored = localStorage.getItem('crawlplexity-custom-models')
    if (!stored) return []
    
    const models = JSON.parse(stored)
    return models.map((model: any) => ({
      ...model,
      createdAt: new Date(model.createdAt),
      updatedAt: new Date(model.updatedAt)
    }))
  } catch (error) {
    console.error('Error loading custom models from storage:', error)
    return []
  }
}

async function saveCustomModelToStorage(model: Omit<CustomModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomModel> {
  const models = await getStoredCustomModels()
  const newModel: CustomModel = {
    ...model,
    id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  models.push(newModel)
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('crawlplexity-custom-models', JSON.stringify(models))
  }
  
  return newModel
}

async function updateCustomModelInStorage(id: string, updates: Partial<CustomModel>): Promise<CustomModel> {
  const models = await getStoredCustomModels()
  const modelIndex = models.findIndex(m => m.id === id)
  
  if (modelIndex === -1) {
    throw new Error('Model not found')
  }
  
  const updatedModel = {
    ...models[modelIndex],
    ...updates,
    id,
    updatedAt: new Date()
  }
  
  models[modelIndex] = updatedModel
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('crawlplexity-custom-models', JSON.stringify(models))
  }
  
  return updatedModel
}

async function deleteCustomModelFromStorage(id: string): Promise<void> {
  const models = await getStoredCustomModels()
  const filteredModels = models.filter(m => m.id !== id)
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('crawlplexity-custom-models', JSON.stringify(filteredModels))
  }
}