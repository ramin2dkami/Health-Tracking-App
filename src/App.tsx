import { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { DataVersionProvider } from './data/DataVersion';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './features/home/HomeScreen';
import { TodayScreen } from './features/today/TodayScreen';
import { ManageScreen } from './features/symptoms/ManageScreen';
import { CalendarScreen } from './features/calendar/CalendarScreen';
import { AddSheet, type AddMode } from './features/add/AddSheet';
import { ProfileGate } from './features/onboarding/ProfileGate';
import './App.css';

function App() {
  const [addMode, setAddMode] = useState<AddMode | null>(null);

  return (
    <DataVersionProvider>
      <HashRouter>
        <div className="app">
          <ProfileGate>
            <main className="app__content">
              <Routes>
                <Route path="/" element={<HomeScreen onAdd={setAddMode} />} />
                <Route path="/log" element={<TodayScreen onAdd={() => setAddMode('menu')} />} />
                <Route path="/calendar" element={<CalendarScreen />} />
                <Route path="/manage" element={<ManageScreen />} />
              </Routes>
            </main>
            <BottomNav onAdd={() => setAddMode('menu')} />
            {addMode && <AddSheet initialMode={addMode} onClose={() => setAddMode(null)} />}
          </ProfileGate>
        </div>
      </HashRouter>
    </DataVersionProvider>
  );
}

export default App;
