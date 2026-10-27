import type { Control, Simulation as Sim } from '../content'
import { stills } from './stills'

function ControlView({ control, name }: { control: Control; name: string }) {
  switch (control.kind) {
    case 'button':
      return (
        <button type="button" className="btn" data-action={control.action}>
          {control.label}
        </button>
      )
    case 'toggle':
      return (
        <button type="button" className="switch" data-action={control.action} aria-pressed={control.pressed}>
          <span className="switch__track" aria-hidden="true">
            <span className="switch__thumb" />
          </span>
          {control.label}
        </button>
      )
    case 'choice':
      return (
        <fieldset className="seg">
          <legend className="visually-hidden">{control.label}</legend>
          {control.options.map((option, i) => (
            <label key={option}>
              <input
                type="radio"
                name={`${name}-${control.action}`}
                value={i}
                defaultChecked={i === control.value}
                data-action={control.action}
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
      )
    case 'range':
      return (
        <label className="range">
          <span className="range__label">{control.label}</span>
          <input
            type="range"
            min={control.min}
            max={control.max}
            defaultValue={control.value}
            data-action={control.action}
            aria-valuetext={`${control.value}% of ${control.text}`}
          />
        </label>
      )
  }
}

export function Simulation({ sim }: { sim: Sim }) {
  const id = `sim-${sim.id}`
  return (
    <figure className="sim" data-sim={sim.id} aria-labelledby={`${id}-title`}>
      <div className="sim__stage">
        <div
          className="sim__still still"
          role="img"
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-desc`}
          style={stills(id)}
        />
      </div>
      <div className="sim__panel">
        <p className="sim__hint">{sim.hint}</p>
        <div className="sim__controls">
          {sim.controls.map((control) => (
            <ControlView key={control.action} control={control} name={id} />
          ))}
        </div>
        <p className="sim__readout" role="status" aria-live="polite">
          {sim.readout}
        </p>
      </div>
      <figcaption>
        <span id={`${id}-title`} className="visually-hidden">
          {sim.title}.{' '}
        </span>
        {sim.caption}
      </figcaption>
      <p id={`${id}-desc`} className="visually-hidden">
        {sim.description}
      </p>
    </figure>
  )
}
