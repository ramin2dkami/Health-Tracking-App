import { useEffect, useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { Icon } from '../../components/Icon';
import { listSymptomDefinitions, listFoodTags, listMealTemplates } from '../../db/repository';
import type { SymptomDefinition, FoodTag, MealTemplate } from '../../db/schema';
import { SymptomQuickAdd } from '../symptoms/SymptomQuickAdd';
import { FoodQuickAdd } from '../food/FoodQuickAdd';
import { MoodQuickAdd } from '../mood/MoodQuickAdd';
import { useDataVersion } from '../../data/DataVersion';
import { ADD_OPTIONS, type AddMode } from './addOptions';

export type { AddMode };

const TITLES: Record<AddMode, string> = {
  menu: 'Add…',
  symptom: 'Log a symptom',
  food: 'Log food',
  mood: 'Mood & stress',
};

export function AddSheet({ initialMode = 'menu', onClose }: { initialMode?: AddMode; onClose: () => void }) {
  const [mode, setMode] = useState<AddMode>(initialMode);
  const [symptoms, setSymptoms] = useState<SymptomDefinition[] | null>(null);
  const [foodTags, setFoodTags] = useState<FoodTag[]>([]);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const { bump } = useDataVersion();

  useEffect(() => {
    Promise.all([listSymptomDefinitions(), listFoodTags(), listMealTemplates()]).then(([s, f, t]) => {
      setSymptoms(s);
      setFoodTags(f);
      setTemplates(t);
    });
  }, []);

  function handleSaved() {
    bump();
    onClose();
  }

  if (mode === 'menu') {
    return (
      <Sheet title={TITLES.menu} onClose={onClose} dark>
        <ul className="add-menu">
          {ADD_OPTIONS.map((o) => (
            <li key={o.mode}>
              <button type="button" className="add-menu__item" onClick={() => setMode(o.mode)}>
                <span className="add-menu__icon" style={{ background: o.color }}>
                  <Icon name={o.icon} size={20} />
                </span>
                <span className="add-menu__text">
                  <span className="add-menu__label">{o.label}</span>
                  <span className="add-menu__hint">{o.hint}</span>
                </span>
                <Icon name="chevronRight" size={18} />
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    );
  }

  return (
    <Sheet title={TITLES[mode]} onClose={onClose} onBack={() => setMode('menu')}>
      {symptoms === null ? null : (
        <>
          {mode === 'symptom' && <SymptomQuickAdd symptoms={symptoms} onAdded={handleSaved} />}
          {mode === 'food' && <FoodQuickAdd foodTags={foodTags} templates={templates} onAdded={handleSaved} />}
          {mode === 'mood' && <MoodQuickAdd onAdded={handleSaved} />}
        </>
      )}
    </Sheet>
  );
}
