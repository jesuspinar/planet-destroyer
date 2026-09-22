import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,shoot,miss,tick,TARGETS} from '../dist/game-core.js';
import * as core from '../dist/game-core.js';
const playing=()=>({...newGame(),status:'playing'});
test('shooting Earth cancels double points and restarts the miss count',()=>{
  const s=playing();
  shoot(s,'Alien');shoot(s,'Mars');miss(s,'Venus');miss(s,'Jupiter');
  shoot(s,'Earth');
  assert.equal(s.bonus,0);assert.equal(s.misses,0);assert.equal(s.lives,4);assert.equal(s.score,20);
  shoot(s,'Mars');assert.equal(s.score,30);
  miss(s,'Venus');assert.equal(s.misses,1);assert.equal(s.lives,4);
});
test('five lives, 10 points per target, and speed increases at each 50-point threshold',()=>{const s=playing();assert.equal(s.lives,5);for(let i=0;i<4;i++)shoot(s,TARGETS[i]);assert.equal(s.score,40);assert.equal(s.speed,1);shoot(s,'Saturn');assert.equal(s.score,50);assert.equal(s.speed,1.4);for(let i=0;i<5;i++)shoot(s,'Venus');assert.equal(s.speed,1.8);});
test('Earth costs one life and never gives points; fifth shot ends the game',()=>{const s=playing();for(let i=0;i<5;i++)shoot(s,'Earth');assert.equal(s.lives,0);assert.equal(s.score,0);assert.equal(s.status,'over');shoot(s,'Venus');assert.equal(s.score,0);});
test('only target misses count and every third miss costs one life',()=>{const s=playing();miss(s,'Earth');miss(s,'Alien');assert.equal(s.misses,0);miss(s,'Mars');miss(s,'Mars');assert.equal(s.lives,5);assert.equal(s.misses,2);miss(s,'Jupiter');assert.equal(s.lives,4);assert.equal(s.misses,0);for(let i=0;i<12;i++)miss(s,'Venus');assert.equal(s.status,'over');assert.equal(s.lives,0);});
test('alien doubles points for exactly 10 gameplay seconds and refreshes on pickup',()=>{const s=playing();shoot(s,'Alien');assert.equal(s.bonus,10);shoot(s,'Mars');assert.equal(s.score,20);tick(s,9);shoot(s,'Alien');assert.equal(s.bonus,10);tick(s,10);assert.equal(s.bonus,0);shoot(s,'Mars');assert.equal(s.score,30);});
test('paused time, shots and misses cannot change the game',()=>{const s=playing();shoot(s,'Alien');s.status='paused';const before={...s};tick(s,30);shoot(s,'Earth');shoot(s,'Mars');miss(s,'Mars');assert.deepEqual(s,before);});
test('double points can cross a speed boundary',()=>{const s=playing();for(let i=0;i<4;i++)shoot(s,'Mars');shoot(s,'Alien');shoot(s,'Jupiter');assert.equal(s.score,60);assert.equal(s.speed,1.4);});
test('planet drops increase with speed and preserve spacing even at high speeds',()=>{
  assert.equal(typeof core.planetSpawnInterval,'function');
  for(const random of [0,.5,1]){
    const base=core.planetSpawnInterval(1,random);
    assert.ok(base>0&&base<1.2+random*.35,'the base cadence is faster than the original cadence');
    for(const speed of [1.4,1.8,3,10,100]){
      const interval=core.planetSpawnInterval(speed,random);
      assert.ok(interval<base);
      assert.ok(Math.abs(interval*48*speed-base*48)<1e-9,'falling distance between drops stays consistent');
    }
  }
});
test('sectors advance with each 50-point speed milestone and reset for a new game',()=>{
  const s=playing();assert.equal(s.sector,1);
  for(let i=0;i<4;i++)shoot(s,'Mars');assert.equal(s.sector,1);
  shoot(s,'Venus');assert.equal(s.sector,2);assert.equal(s.speed,1.4);
  for(let i=0;i<5;i++)shoot(s,'Mars');assert.equal(s.sector,3);assert.equal(s.speed,1.8);
  shoot(s,'Earth');assert.equal(s.sector,3);
  assert.equal(newGame().sector,1);
});
test('double points advance the sector when a shot crosses a milestone',()=>{
  const s=playing();for(let i=0;i<4;i++)shoot(s,'Mars');
  shoot(s,'Alien');shoot(s,'Mars');assert.equal(s.score,60);assert.equal(s.sector,2);
});
