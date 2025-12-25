"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Play, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import { streamTestRun, fetchTestResults } from '@/lib/api'

interface TestCase {
  id: number
  suite: string
  query: string
  complexity: string
  status: 'pending' | 'running' | 'passed' | 'failed' | 'error'
  result?: boolean
  expected?: boolean
  error?: string
}

interface TestSuiteInfo {
  name: string
  status: 'pending' | 'running' | 'complete'
  stats?: {
    [key: string]: {
      total: number
      passed: number
      failed: number
      unknown: number
    }
  }
}

export default function TestInterface() {
  const [isRunning, setIsRunning] = useState(false)
  const [testSuites, setTestSuites] = useState<{ [key: string]: TestSuiteInfo }>({})
  const [testCases, setTestCases] = useState<{ [key: string]: TestCase }>({})
  const [currentSuite, setCurrentSuite] = useState<string | null>(null)
  const [overallStatus, setOverallStatus] = useState<string>('')
  const [errorDetails, setErrorDetails] = useState<string | null>(null)

  useEffect(() => {
    loadPreviousResults()
  }, [])

  const loadPreviousResults = async () => {
    try {
      const results = await fetchTestResults()
      if (results) {
        // Reconstruct test suites and cases from saved results
        const suites: { [key: string]: TestSuiteInfo } = {}
        const cases: { [key: string]: TestCase } = {}

        // Process check_relevance results
        if (results.check_relevance?.results) {
          suites['check_relevance'] = {
            name: 'Проверка релевантности заметок',
            status: 'complete',
          }

          results.check_relevance.results.forEach((result: any) => {
            const key = `check_relevance-${result.id}`
            const passed = result.relevant === result.expected_value
            cases[key] = {
              id: result.id,
              suite: 'check_relevance',
              query: '',
              complexity: result.complexity,
              status: passed ? 'passed' : 'failed',
              result: result.relevant,
              expected: result.expected_value,
            }
          })
        }

        // Process should_extend_context results
        if (results.should_extend_context?.results) {
          suites['should_extend_context'] = {
            name: 'Проверка необходимости расширения контекста',
            status: 'complete',
          }

          results.should_extend_context.results.forEach((result: any) => {
            const key = `should_extend_context-${result.id}`
            const passed = result.needs_extension === result.expected_value
            cases[key] = {
              id: result.id,
              suite: 'should_extend_context',
              query: '',
              complexity: result.complexity,
              status: passed ? 'passed' : 'failed',
              result: result.needs_extension,
              expected: result.expected_value,
            }
          })
        }

        setTestSuites(suites)
        setTestCases(cases)
        setOverallStatus('Загружены результаты последнего запуска')
      }
    } catch (error) {
      // Silently ignore if no previous results exist (404)
      if (error instanceof Error && !error.message.includes('404')) {
        console.error('Failed to load previous results:', error)
      }
    }
  }

  const runTests = async () => {
    setIsRunning(true)
    setTestSuites({})
    setTestCases({})
    setCurrentSuite(null)
    setOverallStatus('Запуск тестов...')
    setErrorDetails(null)

    let hasError = false

    try {
      for await (const event of streamTestRun()) {
        if (event.type === 'error') {
          hasError = true
        }
        handleTestEvent(event)
      }

      if (!hasError) {
        setOverallStatus('Все тесты завершены')
      }
    } catch (error) {
      console.error('Error running tests:', error)
      setOverallStatus('Ошибка при выполнении тестов')
    } finally {
      setIsRunning(false)
    }
  }

  const handleTestEvent = (event: any) => {
    switch (event.type) {
      case 'suite_start':
        setOverallStatus(event.message)
        break

      case 'test_suite_start':
        setCurrentSuite(event.suite)
        setTestSuites(prev => ({
          ...prev,
          [event.suite]: {
            name: event.name,
            status: 'running',
          }
        }))
        break

      case 'test_start':
        const testKey = `${event.suite}-${event.id}`
        setTestCases(prev => ({
          ...prev,
          [testKey]: {
            id: event.id,
            suite: event.suite,
            query: event.query,
            complexity: event.complexity,
            status: 'running',
          }
        }))
        break

      case 'test_complete':
        const completeKey = `${event.suite}-${event.id}`
        setTestCases(prev => ({
          ...prev,
          [completeKey]: {
            ...prev[completeKey],
            status: event.passed ? 'passed' : 'failed',
            result: event.result,
            expected: event.expected,
          }
        }))
        break

      case 'test_error':
        const errorKey = `${event.suite}-${event.id}`
        setTestCases(prev => ({
          ...prev,
          [errorKey]: {
            ...prev[errorKey],
            status: 'error',
            error: event.error,
          }
        }))
        break

      case 'test_suite_complete':
        setTestSuites(prev => ({
          ...prev,
          [event.suite]: {
            ...prev[event.suite],
            status: 'complete',
            stats: event.stats,
          }
        }))
        break

      case 'suite_complete':
        setOverallStatus(event.message)
        setCurrentSuite(null)
        break

      case 'error':
        setOverallStatus(`Ошибка: ${event.message}`)
        setErrorDetails(event.error || event.message)
        break
    }
  }

  const getTestIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-orange-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'easy':
        return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      case 'hard':
        return 'bg-red-500/20 text-red-400 border-red-500/50'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  const renderSuiteStats = (stats: any) => {
    if (!stats) return null

    return (
      <div className="grid grid-cols-3 gap-4 mt-4">
        {Object.entries(stats).map(([level, vals]: [string, any]) => (
          <Card key={level} className="bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                <span className={`inline-block px-2 py-1 rounded text-xs border ${getComplexityColor(level)}`}>
                  {level}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Всего:</span>
                <span className="font-medium">{vals.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-400">Пройдено:</span>
                <span className="font-medium text-green-400">{vals.passed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-400">Провалено:</span>
                <span className="font-medium text-red-400">{vals.failed}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Тесты LLM функций</CardTitle>
          <CardDescription>
            Запуск тестов для проверки корректности работы check_relevance и should_extend_context
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={runTests}
              disabled={isRunning}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {isRunning ? 'Выполняются тесты...' : 'Запустить тесты'}
            </Button>

            {overallStatus && (
              <div className={`flex items-center gap-2 text-sm ${overallStatus.startsWith('Ошибка') ? 'text-red-500' : ''}`}>
                {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
                {overallStatus.startsWith('Ошибка') && <XCircle className="h-4 w-4" />}
                <span>{overallStatus}</span>
              </div>
            )}
          </div>

          {errorDetails && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-red-500 mb-2">Детали ошибки</p>
                  <pre className="text-sm text-red-400 whitespace-pre-wrap break-words">
                    {errorDetails}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {Object.entries(testSuites).map(([suiteKey, suite]) => (
        <Card key={suiteKey}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {suite.status === 'running' && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
                  {suite.status === 'complete' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  {suite.name}
                </CardTitle>
                <CardDescription className="mt-1">
                  {suiteKey === 'check_relevance' ? 'Проверка релевантности заметок' : 'Проверка необходимости расширения контекста'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {Object.entries(testCases)
                  .filter(([key]) => key.startsWith(suiteKey))
                  .map(([key, test]) => (
                    <div
                      key={key}
                      className={`
                        p-3 rounded-lg border transition-all
                        ${test.status === 'running' ? 'border-blue-500/50 bg-blue-500/10' : ''}
                        ${test.status === 'passed' ? 'border-green-500/50 bg-green-500/5' : ''}
                        ${test.status === 'failed' ? 'border-red-500/50 bg-red-500/10' : ''}
                        ${test.status === 'error' ? 'border-orange-500/50 bg-orange-500/10' : ''}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getTestIcon(test.status)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">Тест #{test.id}</span>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs border ${getComplexityColor(test.complexity)}`}>
                              {test.complexity}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{test.query}</p>
                          {(test.status === 'passed' || test.status === 'failed') && (
                            <div className="flex gap-4 text-xs">
                              <span>
                                Результат: <span className={test.result ? 'text-green-400' : 'text-red-400'}>
                                  {test.result ? 'true' : 'false'}
                                </span>
                              </span>
                              <span>
                                Ожидалось: <span className={test.expected ? 'text-green-400' : 'text-red-400'}>
                                  {test.expected ? 'true' : 'false'}
                                </span>
                              </span>
                            </div>
                          )}
                          {test.error && (
                            <p className="text-xs text-orange-400 mt-2">{test.error}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>

            {suite.stats && renderSuiteStats(suite.stats)}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
