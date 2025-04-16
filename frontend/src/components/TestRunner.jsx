"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import axios from "axios"
import { AlertTriangle } from "lucide-react"

// Modificar el componente TestRunner para manejar diferentes distribuciones
// Agregar constantes para los tipos de distribución
const DISTRIBUTION_TYPES = {
  UNIFORM: 0,
  EXPONENTIAL: 1,
  NORMAL: 2,
  POISSON: 3,
  EMPIRICAL: 4,
  OTHER: 5,
}

// Agregar constantes para los nombres de distribución
const DISTRIBUTION_NAMES = {
  0: "Uniforme",
  1: "Exponencial",
  2: "Normal",
  3: "Poisson",
  4: "Empírica",
  5: "Otra",
}

// Función para sanitizar datos y evitar valores NaN o Infinity
const sanitizeData = (data) => {
  if (Array.isArray(data)) {
    return data.map(sanitizeData).filter((val) => val !== null)
  } else if (data !== null && typeof data === "object") {
    const result = {}
    for (const key in data) {
      const sanitizedValue = sanitizeData(data[key])
      if (sanitizedValue !== null) {
        result[key] = sanitizedValue
      }
    }
    return result
  } else if (typeof data === "number") {
    // Reemplazar NaN o Infinity con null para que sea compatible con JSON
    return Number.isNaN(data) || !Number.isFinite(data) ? null : data
  }
  return data
}

const TestRunner = ({ rnd, mo }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm()
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)
  const [test, setTest] = useState(null)
  const [loading, setLoading] = useState(false)
  const [serverStatus, setServerStatus] = useState("checking") // "checking", "online", "offline"
  const [debugInfo, setDebugInfo] = useState(null)
  // Modificar el estado para incluir el tipo de distribución actual
  const [currentDistribution, setCurrentDistribution] = useState(mo !== undefined ? Number(mo) : 0)

  // Observar el valor actual de mo
  const watchedMo = watch("mo")

  // Verificar la conexión con el servidor al cargar el componente
  useEffect(() => {
    const checkServerConnection = async () => {
      try {
        // Intentar una solicitud simple para verificar si el servidor está disponible
        await axios
          .get("http://127.0.0.1:8000/health", { timeout: 3000 })
          .then(() => {
            setServerStatus("online")
            setError(null)
          })
          .catch(() => {
            // Intentar con la ruta raíz si /health no está disponible
            return axios.get("http://127.0.0.1:8000/", { timeout: 3000 })
          })
          .then(() => {
            setServerStatus("online")
            setError(null)
          })
          .catch((err) => {
            throw err
          })
      } catch (err) {
        console.error("Error al conectar con el servidor:", err)
        setServerStatus("offline")
        setError(
          "No se pudo conectar con el servidor de pruebas estadísticas. Asegúrate de que el servidor esté en ejecución en http://127.0.0.1:8000",
        )
      }
    }

    checkServerConnection()
  }, [])

  // Verificar y mostrar información sobre los números aleatorios recibidos
  useEffect(() => {
    // Mostrar información de depuración sobre los números aleatorios
    if (rnd !== undefined) {
      const info = {
        tipo: typeof rnd,
        esArray: Array.isArray(rnd),
        longitud: Array.isArray(rnd) ? rnd.length : 0,
        muestra: Array.isArray(rnd) && rnd.length > 0 ? rnd.slice(0, 5) : [],
      }
      setDebugInfo(info)
      console.log("Información de rnd:", info)
    } else {
      setDebugInfo({ mensaje: "No se recibieron números aleatorios (rnd es undefined)" })
      console.log("rnd es undefined")
    }
  }, [rnd])

  // Establecer los valores iniciales del formulario
  useEffect(() => {
    setValue("a", 0.05)
    setValue("i", 10)
    if (mo !== undefined) {
      setValue("mo", mo)
      setCurrentDistribution(Number(mo))
    }
  }, [mo, setValue])

  // Actualizar la distribución actual cuando cambia el valor de mo en el formulario
  useEffect(() => {
    if (watchedMo !== undefined) {
      setCurrentDistribution(Number(watchedMo))
    }
  }, [watchedMo])

  // Modificar la función ejecutarPrueba para asegurar que se envíe el formato JSON correcto
  // Reemplazar la sección donde se construye el payload con lo siguiente:

  // Ejecutar la prueba directamente sin depender del estado
  const ejecutarPrueba = async (tipoTest) => {
    // Obtener los valores del formulario directamente
    const a = document.querySelector('input[name="a"]')?.value || 0.05
    const i = document.querySelector('input[name="i"]')?.value || 10
    const moValue = document.querySelector('select[name="mo"]')?.value || 0
    const distributionType = Number.parseInt(moValue)

    // Verificar y procesar los números aleatorios
    let RND = []

    // Intentar obtener los números aleatorios de diferentes formas
    if (Array.isArray(rnd) && rnd.length > 0) {
      RND = rnd
    } else if (typeof rnd === "string") {
      // Intentar convertir una cadena a un array de números
      RND = rnd
        .split(",")
        .map((n) => Number.parseFloat(n.trim()))
        .filter((n) => !isNaN(n))
    } else if (typeof rnd === "object" && rnd !== null) {
      // Si es un objeto, intentar convertirlo a array
      try {
        RND = Object.values(rnd).filter((val) => typeof val === "number" && !isNaN(val))
      } catch (e) {
        console.error("Error al procesar rnd como objeto:", e)
      }
    }

    // Si aún no hay números, crear algunos de prueba (solo para desarrollo)
    if (RND.length === 0) {
      console.warn("Generando números aleatorios de prueba ya que no se proporcionaron")
      RND = Array.from({ length: 100 }, () => Math.random())
    }

    // Usar todos los números disponibles sin limitación
    const muestraRND = RND.filter((num) => Number.isFinite(num) && !Number.isNaN(num))

    if (muestraRND.length === 0) {
      setError("No hay datos válidos para realizar la prueba. Todos los valores son NaN o Infinity.")
      return
    }

    setLoading(true)

    try {
      // Construir la URL correcta para el endpoint
      const baseUrl = "http://127.0.0.1:8000" // Asegurarse de que esta es la URL correcta del backend
      const endpoint = tipoTest === "chi-cuadrado" ? `${baseUrl}/tests/chi-cuadrado` : `${baseUrl}/tests/k-s`

      // Calcular parámetros comunes que pueden ser necesarios
      const media = muestraRND.reduce((sum, val) => sum + val, 0) / muestraRND.length

      // Para distribuciones que necesitan desviación estándar
      let desviacion = 0
      if (distributionType === DISTRIBUTION_TYPES.NORMAL) {
        desviacion = Math.sqrt(
          muestraRND.reduce((sum, val) => sum + Math.pow(val - media, 2), 0) / (muestraRND.length - 1),
        )
      }

      // Para distribuciones que necesitan lambda
      let lambda = 0
      if (distributionType === DISTRIBUTION_TYPES.EXPONENTIAL) {
        lambda = 1 / media
      } else if (distributionType === DISTRIBUTION_TYPES.POISSON) {
        lambda = media
      }

      // Construir el payload exactamente en el formato que espera el backend
      const payload = {
        rnd: muestraRND,
        a: Number.parseFloat(a),
        dist: DISTRIBUTION_NAMES[distributionType],
        i: Number.parseInt(i),
      }

      // Añadir parámetros específicos según la distribución
      if (distributionType === DISTRIBUTION_TYPES.EXPONENTIAL) {
        payload.lambd = lambda
      } else if (distributionType === DISTRIBUTION_TYPES.NORMAL) {
        payload.media = media
        payload.des = desviacion
      } else if (distributionType === DISTRIBUTION_TYPES.POISSON) {
        payload.lambd = lambda
      }

      // Verificar que los datos sean compatibles con la distribución seleccionada
      if (distributionType === DISTRIBUTION_TYPES.POISSON) {
        // Para Poisson, los valores deben ser enteros no negativos
        const tieneValoresInvalidos = muestraRND.some((val) => val < 0 || Math.floor(val) !== val)
        if (tieneValoresInvalidos) {
          setError(
            "La distribución Poisson requiere valores enteros no negativos. Algunos datos no cumplen este requisito.",
          )
          setLoading(false)
          return
        }
      }

      // Sanitizar el payload para evitar valores NaN o Infinity
      const sanitizedPayload = sanitizeData(payload)

      console.log(`Enviando solicitud a: ${endpoint}`)
      console.log(
        "Payload:",
        JSON.stringify({
          ...sanitizedPayload,
          rnd: `[${sanitizedPayload.rnd.length} números] Muestra de los primeros 10: ${JSON.stringify(
            sanitizedPayload.rnd.slice(0, 10),
          )}`,
        }),
      )

      // Mostrar información de depuración
      setError(`Intentando conectar a ${endpoint}...`)

      const res = await axios.post(endpoint, sanitizedPayload)
      setResultado(res.data)
      console.log("Respuesta:", res)
      setError(null)
    } catch (err) {
      setResultado(null)

      // Mejorar el manejo de errores para mostrar detalles más específicos
      let errorMessage = `Error al ejecutar ${tipoTest}: `

      if (err.response) {
        errorMessage += `${err.response.status} ${err.response.statusText}`

        // Mostrar detalles del error si están disponibles
        if (err.response.data) {
          if (typeof err.response.data === "string") {
            errorMessage += ` - ${err.response.data}`
          } else if (err.response.data.detail) {
            if (typeof err.response.data.detail === "string") {
              errorMessage += ` - ${err.response.data.detail}`
            } else {
              errorMessage += ` - ${JSON.stringify(err.response.data.detail)}`
            }
          } else if (err.response.data.error) {
            errorMessage += ` - ${err.response.data.error}`
          } else {
            errorMessage += ` - ${JSON.stringify(err.response.data)}`
          }
        }
      } else {
        errorMessage += `${err.message} (posiblemente el servidor no está disponible)`
      }

      // Verificar si el error está relacionado con valores NaN
      if (err.message && err.message.includes("JSON")) {
        errorMessage +=
          "\n\nEl error puede estar relacionado con valores NaN o Infinity en los datos. Intenta con otro conjunto de datos."
      }

      setError(errorMessage)
      console.error("Error completo:", err)
    } finally {
      setLoading(false)
    }
  }

  const ejecutarPruebaPoissonChiCuadrado = async (tipoTest)=>{
    // Obtener los valores del formulario directamente
    const a = document.querySelector('input[name="a"]')?.value || 0.05
    const i = document.querySelector('input[name="i"]')?.value || 10
    const moValue = document.querySelector('select[name="mo"]')?.value || 0
    const distributionType = Number.parseInt(moValue)

    // Verificar y procesar los números aleatorios
    let RND = []

    // Intentar obtener los números aleatorios de diferentes formas
    if (Array.isArray(rnd) && rnd.length > 0) {
      RND = rnd
    } else if (typeof rnd === "string") {
      // Intentar convertir una cadena a un array de números
      RND = rnd
        .split(",")
        .map((n) => Number.parseFloat(n.trim()))
        .filter((n) => !isNaN(n))
    } else if (typeof rnd === "object" && rnd !== null) {
      // Si es un objeto, intentar convertirlo a array
      try {
        RND = Object.values(rnd).filter((val) => typeof val === "number" && !isNaN(val))
      } catch (e) {
        console.error("Error al procesar rnd como objeto:", e)
      }
    }

    // Si aún no hay números, crear algunos de prueba (solo para desarrollo)
    if (RND.length === 0) {
      console.warn("Generando números aleatorios de prueba ya que no se proporcionaron")
      RND = Array.from({ length: 100 }, () => Math.random())
    }

    // Usar todos los números disponibles sin limitación
    const muestraRND = RND.filter((num) => Number.isFinite(num) && !Number.isNaN(num))

    if (muestraRND.length === 0) {
      setError("No hay datos válidos para realizar la prueba. Todos los valores son NaN o Infinity.")
      return
    }

    setLoading(true)

    try {
      // Construir la URL correcta para el endpoint
      const baseUrl = "http://127.0.0.1:8000" // Asegurarse de que esta es la URL correcta del backend
      const endpoint = `${baseUrl}/tests/chi-cuadrado/poisson`

      // Calcular parámetros comunes que pueden ser necesarios
      const media = muestraRND.reduce((sum, val) => sum + val, 0) / muestraRND.length

      // Para distribuciones que necesitan desviación estándar
      let desviacion = 0
      if (distributionType === DISTRIBUTION_TYPES.NORMAL) {
        desviacion = Math.sqrt(
          muestraRND.reduce((sum, val) => sum + Math.pow(val - media, 2), 0) / (muestraRND.length - 1),
        )
      }

      // Para distribuciones que necesitan lambda
      let lambda = 0
      if (distributionType === DISTRIBUTION_TYPES.EXPONENTIAL) {
        lambda = 1 / media
      } else if (distributionType === DISTRIBUTION_TYPES.POISSON) {
        lambda = media
      }

      // Construir el payload exactamente en el formato que espera el backend
      const payload = {
        rnd: muestraRND,
        a: Number.parseFloat(a),
        lambd: Number.parseFloat(lambda),
        i: Number.parseInt(i)
      }
      // Verificar que los datos sean compatibles con la distribución seleccionada
      if (distributionType === DISTRIBUTION_TYPES.POISSON) {
        // Para Poisson, los valores deben ser enteros no negativos
        const tieneValoresInvalidos = muestraRND.some((val) => val < 0 || Math.floor(val) !== val)
        if (tieneValoresInvalidos) {
          setError(
            "La distribución Poisson requiere valores enteros no negativos. Algunos datos no cumplen este requisito.",
          )
          setLoading(false)
          return
        }
      }

      // Sanitizar el payload para evitar valores NaN o Infinity
      const sanitizedPayload = sanitizeData(payload)
      console.log(sanitizedPayload)

      console.log(`Enviando solicitud a: ${endpoint}`)
      /*console.log(
        "Payload:",
        JSON.stringify({
          ...sanitizedPayload,
          rnd: `[${sanitizedPayload.numeros.length} números] Muestra de los primeros 10: ${JSON.stringify(
            sanitizedPayload.numeros.slice(0, 10),
          )}`,
        }),
      )*/

      // Mostrar información de depuración
      setError(`Intentando conectar a ${endpoint}...`)

      const res = await axios.post(endpoint, sanitizedPayload)
      setResultado(res.data)
      console.log("Respuesta:", res)
      setError(null)
    } catch (err) {
      setResultado(null)

      // Mejorar el manejo de errores para mostrar detalles más específicos
      let errorMessage = `Error al ejecutar ${tipoTest}: `

      if (err.response) {
        errorMessage += `${err.response.status} ${err.response.statusText}`

        // Mostrar detalles del error si están disponibles
        if (err.response.data) {
          if (typeof err.response.data === "string") {
            errorMessage += ` - ${err.response.data}`
          } else if (err.response.data.detail) {
            if (typeof err.response.data.detail === "string") {
              errorMessage += ` - ${err.response.data.detail}`
            } else {
              errorMessage += ` - ${JSON.stringify(err.response.data.detail)}`
            }
          } else if (err.response.data.error) {
            errorMessage += ` - ${err.response.data.error}`
          } else {
            errorMessage += ` - ${JSON.stringify(err.response.data)}`
          }
        }
      } else {
        errorMessage += `${err.message} (posiblemente el servidor no está disponible)`
      }

      // Verificar si el error está relacionado con valores NaN
      if (err.message && err.message.includes("JSON")) {
        errorMessage +=
          "\n\nEl error puede estar relacionado con valores NaN o Infinity en los datos. Intenta con otro conjunto de datos."
      }

      setError(errorMessage)
      console.error("Error completo:", err)
    } finally {
      setLoading(false)
    }
  }
  // Manejador para ejecutar la prueba seleccionada
  const handleTestRun = (tipoTest) => {
    // Actualizar el estado y ejecutar la prueba
    setTest(tipoTest)
    setResultado(null)
    setError(null)

    // Ejecutar la prueba directamente sin depender del estado
    ejecutarPrueba(tipoTest)
  }

  const handleTestRunPoisson = (tipoTest) => {
    console.log("xd")
    // Actualizar el estado y ejecutar la prueba
    setTest(tipoTest)
    setResultado(null)
    setError(null)

    // Ejecutar la prueba directamente sin depender del estado
    ejecutarPruebaPoissonChiCuadrado(tipoTest)
  }
  const renderResultado = () => {
    if (!resultado || !resultado.Test) return null

    const testData = resultado.Test

    // Verificar si es una respuesta de Poisson (tiene formato diferente)
    const isPoissonResponse = testData.limites !== undefined && !Array.isArray(testData[0])

    if (isPoissonResponse) {
      // Formato específico para Poisson
      const { observados, esperados, chi, x_2_calc, x_2_tabla, limites } = testData

      return (
        <div className="space-y-4 mt-6">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="border px-2 py-1">Intervalo</th>
                <th className="border px-2 py-1">Observado</th>
                <th className="border px-2 py-1">Esperado</th>
                <th className="border px-2 py-1">Chi-Cuadrado</th>
              </tr>
            </thead>
            <tbody>
              {limites.map((limite, idx) => (
                <tr key={idx} className="text-center">
                  <td className="border px-2 py-1">{limite}</td>
                  <td className="border px-2 py-1">{observados[idx]}</td>
                  <td className="border px-2 py-1">{esperados[idx]}</td>
                  <td className="border px-2 py-1">
                    {typeof chi[idx] === "number" && !Number.isNaN(chi[idx]) && Number.isFinite(chi[idx])
                      ? chi[idx].toFixed(4)
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pt-4 text-sm">
            <p>
              <strong>Chi-Cuadrado Calculado:</strong>{" "}
              {Number.isFinite(x_2_calc) && !Number.isNaN(x_2_calc) ? x_2_calc : "N/A"}
            </p>
            <p>
              <strong>Chi-Cuadrado de Tabla:</strong>{" "}
              {Number.isFinite(x_2_tabla) && !Number.isNaN(x_2_tabla) ? x_2_tabla : "N/A"}
            </p>
            <p className="mt-2 font-medium">
              Conclusión:{" "}
              {Number.isFinite(x_2_calc) &&
              Number.isFinite(x_2_tabla) &&
              !Number.isNaN(x_2_calc) &&
              !Number.isNaN(x_2_tabla) ? (
                Number.parseFloat(x_2_calc) <= Number.parseFloat(x_2_tabla) ? (
                  <span className="text-green-600">
                    No se rechaza la hipótesis de que los datos siguen la distribución teórica
                  </span>
                ) : (
                  <span className="text-red-600">
                    Se rechaza la hipótesis de que los datos siguen la distribución teórica
                  </span>
                )
              ) : (
                <span className="text-amber-600">
                  No se puede determinar la conclusión debido a valores no válidos en los resultados
                </span>
              )}
            </p>
          </div>
        </div>
      )
    }

    // Formato estándar para otras distribuciones
    /*fix juancito*/
    
    const valorCalculado = test === "chi-cuadrado" ? testData[testData.length - 4][1] : testData[testData.length - 3]
    const valorTabla = test === "chi-cuadrado" ? testData[testData.length - 3][1] : testData[testData.length - 2]

    const filas = testData[0].map((_, i) => {
      return testData.slice(0, testData.length - 2).map((col) => col[i])
    })

    return (
      <div className="space-y-4 mt-6">
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="border px-2 py-1"># Intervalo</th>
              <th className="border px-2 py-1">Rango</th>
              {test === "chi-cuadrado" ? (
                <>
                  <th className="border px-2 py-1">Observado</th>
                  <th className="border px-2 py-1">Esperado</th>
                  <th className="border px-2 py-1">Chi-Cuadrado</th>
                  <th className="border px-2 py-1">CC acumulado</th>
                </>
              ) : (
                <>
                  <th className="border px-2 py-1">Observado</th>
                  <th className="border px-2 py-1">Esperado</th>
                  <th className="border px-2 py-1">PVO</th>
                  <th className="border px-2 py-1">PFE</th>
                  <th className="border px-2 py-1">ΣPVO</th>
                  <th className="border px-2 py-1">ΣPFE</th>
                  <th className="border px-2 py-1">Diferencia</th>
                  <th className="border px-2 py-1">Mayor dif</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {/*<button onClick={()=>{console.log(testData)}}>a</button>*//*boton para debugear*/}
            {
              
              test === "chi-cuadrado" ? 
              (() => {
                let acumuladoTotal = 0;
                return testData.slice(1, testData.length - 4).map((fila, idx) => {
                  acumuladoTotal += Number(fila[4]); // Sumamos el valor actual al acumulado total
                  return (
                    <tr key={idx} className="text-center">
                      <td className="border px-2 py-1">{idx + 1}</td>
                      <td className="border px-2 py-1">{fila[0]} - {fila[1]}</td>
                      <td className="border px-2 py-1">{fila[2]}</td>
                      <td className="border px-2 py-1">{fila[3]}</td>
                      <td className="border px-2 py-1">{fila[4]}</td>
                      <td className="border px-2 py-1">{acumuladoTotal.toFixed(4)}</td> {/* Acumulado de TODAS las filas anteriores */}
                    </tr>
                  );
                });
              })()
              :
              filas.map((fila, idx) => (
              <tr key={idx} className="text-center">
                <td className="border px-2 py-1">{idx + 1}</td> 
                {/*cambios juancito*/}
                <td className="border px-2 py-1"> {testData[10][idx]?testData[10][idx][0]:""} - {testData[10][idx]?testData[10][idx][1]:""} </td>
                {fila.map((col, i) => (
                  i == 8 ? " " :
                  <td key={i} className="border px-2 py-1">
                    {typeof col === "number" && !Number.isNaN(col) && Number.isFinite(col) ? col.toFixed(4) : "N/A"}
                  </td>
                ))}
              </tr>
            ))
            }
          </tbody>
        </table>

        {/* Valores finales */}
        <div className="pt-4 text-sm">
          <p>
            <strong>{test === "chi-cuadrado" ? "Chi-Cuadrado" : "K-S"} Calculado:</strong>{" "}
            {Number.isFinite(valorCalculado) && !Number.isNaN(valorCalculado) ? valorCalculado : "N/A"}
          </p>
          <p>
            <strong>{test === "chi-cuadrado" ? "Chi-Cuadrado" : "K-S"} de Tabla:</strong>{" "}
            {Number.isFinite(valorTabla) && !Number.isNaN(valorTabla) ? valorTabla : "N/A"}
          </p>
          <p className="mt-2 font-medium">
            Conclusión:{" "}
            {Number.isFinite(valorCalculado) &&
            Number.isFinite(valorTabla) &&
            !Number.isNaN(valorCalculado) &&
            !Number.isNaN(valorTabla) ? (
              Number.parseFloat(valorCalculado) <= Number.parseFloat(valorTabla) ? (
                <span className="text-green-600">
                  No se rechaza la hipótesis de que los datos siguen la distribución teórica
                </span>
              ) : (
                <span className="text-red-600">
                  Se rechaza la hipótesis de que los datos siguen la distribución teórica
                </span>
              )
            ) : (
              <span className="text-amber-600">
                No se puede determinar la conclusión debido a valores no válidos en los resultados
              </span>
            )}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-lg rounded-2xl p-8 max-w-4xl w-full mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-center text-gray-800">Pruebas Estadísticas</h2>

      <div className="bg-blue-50 p-4 rounded-lg text-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle className="text-blue-600 mt-0.5" size={18} />
          <div>
            <p className="font-medium text-blue-800">Información sobre las pruebas:</p>
            <ul className="list-disc pl-5 mt-1 text-blue-700 space-y-1">
              <li>
                <strong>Chi-Cuadrado:</strong> Evalúa si la distribución de frecuencias observadas se ajusta a la
                distribución teórica.
              </li>
              <li>
                <strong>Kolmogorov-Smirnov (K-S):</strong> Compara la distribución acumulada observada con la teórica.
              </li>
              <li>Se utilizarán todos los números disponibles para las pruebas estadísticas.</li>
            </ul>
          </div>
        </div>
      </div>

      <form className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">Valor de α (nivel de significancia):</label>
            <input
              type="number"
              step="any"
              {...register("a", { required: "Este campo es obligatorio" })}
              className="mt-1 w-full rounded border border-gray-300 p-2"
              placeholder="0.05"
            />
            {errors.a && <p className="text-red-500 text-sm">{errors.a.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">Cantidad de intervalos (i) (para K-S):</label>
            <input
              type="number"
              {...register("i")}
              className={Number(currentDistribution) === DISTRIBUTION_TYPES.POISSON ? "mt-1 w-full rounded border border-gray-300 p-2 text-white" : "mt-1 w-full rounded border border-gray-300 p-2" }
              placeholder="Ej. 10"
              disabled={Number(currentDistribution) === DISTRIBUTION_TYPES.POISSON}
            />
            {Number(currentDistribution) === DISTRIBUTION_TYPES.POISSON && (
              <p className="text-xs text-amber-600 mt-1">
                Valor automático para Poisson.
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-600">Distribución de los datos: (mo)</p>
          <label className="block text-sm font-medium text-gray-600">Tipo de distribución (mo):</label>
          <select
            {...register("mo")}
            className="mt-1 w-full rounded border border-gray-300 p-2"
            disabled={true} // Deshabilitado ya que viene del componente padre
            onChange={(e) => setCurrentDistribution(Number(e.target.value))}
          >
            <option value="0">Uniforme (0)</option>
            <option value="1">Exponencial (1)</option>
            <option value="2">Normal (2)</option>
            <option value="3">Poisson (3)</option>
            <option value="4">Empírica (4)</option>
            <option value="5">Otra (5)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            El tipo de distribución se establece automáticamente según los datos generados.
          </p>
        </div>

        <div className="flex justify-center space-x-4 pt-2">
          <button
            type="button"
            onClick={() => {console.log(Number(currentDistribution)); Number(currentDistribution) === DISTRIBUTION_TYPES.POISSON ? handleTestRunPoisson("chi-cuadrado")  : handleTestRun("chi-cuadrado")}}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
            disabled={loading || serverStatus !== "online"}
          >
            {loading && test === "chi-cuadrado" ? "Ejecutando..." : "Ejecutar Chi-Cuadrado"}
          </button>

          {/* Solo mostrar el botón K-S para distribuciones que no sean Poisson */}
          {Number(currentDistribution) !== DISTRIBUTION_TYPES.POISSON && (
            <button
              type="button"
              onClick={() => handleTestRun("K-S")}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition disabled:opacity-50"
              disabled={loading || serverStatus !== "online"}
            >
              {loading && test === "K-S" ? "Ejecutando..." : "Ejecutar K-S"}
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="text-red-600 text-sm p-3 bg-red-50 rounded whitespace-pre-wrap break-words">{error}</div>
      )}

      {loading ? <div className="text-center text-gray-500">Ejecutando test...</div> : renderResultado()}
    </div>
  )
}

export default TestRunner
