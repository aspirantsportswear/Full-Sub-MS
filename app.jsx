import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient' // Path to your file

function App() {
  const [data, setData] = useState([])

  useEffect(() => {
    async function fetchData() {
      let { data: items, error } = await supabase
        .from('your_table_name')
        .select('*')
      
      if (error) console.log("error", error)
      else setData(items)
    }

    fetchData()
  }, [])

  return (
    <div>
      <h1>Data from Supabase:</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}

export default App