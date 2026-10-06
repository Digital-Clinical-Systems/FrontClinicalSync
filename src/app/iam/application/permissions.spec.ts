import { TestBed } from '@angular/core/testing';
import { Permissions } from './permissions';
import { CurrentUser } from '../domain/model/current-user';
import { Role } from '../domain/model/role.enum';

/**
 * Estas pruebas fijan lo que la interfaz promete al usuario. La autoridad sigue
 * siendo del dominio: si alguna de estas respuestas se desalineara de los
 * agregados, la operacion se rechazaria igual, pero el usuario recibiria una
 * explicacion equivocada. Por eso cada caso comprueba tambien que haya motivo.
 */
describe('Permissions — lo que la interfaz anticipa del dominio', () => {
  let permisos: Permissions;
  let usuario: CurrentUser;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    permisos = TestBed.inject(Permissions);
    usuario = TestBed.inject(CurrentUser);
  });

  const comoEnfermeria = () => usuario.switchTo(Role.Nurse);
  const comoMedico = () => usuario.switchTo(Role.Physician);

  it('toda denegacion lleva un motivo redactado', () => {
    comoEnfermeria();
    const casos = [
      permisos.emitirIndicacion(),
      permisos.registrarCumplimiento('otro', false, false),
      permisos.acusarTraspaso('enf-999', false),
    ];
    for (const c of casos) {
      expect(c.permitido).toBeFalse();
      expect(c.motivo.length).toBeGreaterThan(20);
    }
  });

  it('solo el medico puede emitir una indicacion', () => {
    comoMedico();
    expect(permisos.emitirIndicacion().permitido).toBeTrue();
    comoEnfermeria();
    expect(permisos.emitirIndicacion().permitido).toBeFalse();
  });

  it('solo enfermeria registra el cumplimiento', () => {
    comoMedico();
    expect(permisos.registrarCumplimiento('otro-medico', false, true).permitido).toBeFalse();
    comoEnfermeria();
    expect(permisos.registrarCumplimiento('med-001', false, true).permitido).toBeTrue();
  });

  it('nadie registra el cumplimiento de lo que el mismo prescribio', () => {
    comoEnfermeria();
    const yo = permisos.idActual;
    expect(permisos.registrarCumplimiento(yo, false, true).permitido).toBeFalse();
  });

  it('una indicacion ya cumplida o reemplazada no admite otro registro', () => {
    comoEnfermeria();
    expect(permisos.registrarCumplimiento('med-001', true, true).permitido).toBeFalse();
    expect(permisos.registrarCumplimiento('med-001', false, false).permitido).toBeFalse();
  });

  it('el traspaso SBAR lo emite enfermeria', () => {
    comoEnfermeria();
    expect(permisos.emitirTraspaso().permitido).toBeTrue();
    comoMedico();
    expect(permisos.emitirTraspaso().permitido).toBeFalse();
  });

  it('el acuse de recibo es solo del enfermero entrante y una sola vez', () => {
    comoEnfermeria();
    const yo = permisos.idActual;
    expect(permisos.acusarTraspaso(yo, false).permitido).toBeTrue();
    expect(permisos.acusarTraspaso(yo, true).permitido).toBeFalse();
    expect(permisos.acusarTraspaso('enf-999', false).permitido).toBeFalse();
  });

  it('cada rol declara sus capacidades para la ayuda de la barra superior', () => {
    comoEnfermeria();
    expect(permisos.capacidadesActuales().length).toBeGreaterThan(3);
    comoMedico();
    expect(permisos.capacidadesActuales().length).toBeGreaterThan(3);
  });
});
