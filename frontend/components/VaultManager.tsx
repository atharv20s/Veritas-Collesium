"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Unlock, Database, Cpu, Activity, Fingerprint, Shield, DollarSign } from "lucide-react";
// import { SentinelVaultClient } from "../../engine/vault_client";

export default function VaultManager() {
  const [isFrozen, setIsFrozen] = useState(false);
  const [balance, setBalance] = useState(125000); // Mock data for demo
  const [activePolicy, setActivePolicy] = useState("v2.6-strict");
  const [velocityThreshold, setVelocityThreshold] = useState("300%");

  // Mock handlers
  const handleFreezeToggle = () => {
    setIsFrozen(!isFrozen);
    // Real implementation would call vaultClient.freezeVault() or unfreezeVault()
  };

  const handleDeposit = () => {
    setBalance(b => b + 10000);
    // Real implementation would call vaultClient.deposit()
  };

  return (
    <div className="w-full relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl p-6">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-emerald-400" />
            Sentinel Vault Control
          </h3>
          <p className="text-sm text-white/50 mt-1">Hardware-Secured Agentic Exchequer</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={handleDeposit}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
          >
            <DollarSign className="w-4 h-4" />
            <span className="font-bold text-sm">Deposit Funds</span>
          </button>
          
          <button 
            onClick={handleFreezeToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              isFrozen 
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30' 
                : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
            }`}
          >
            {isFrozen ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            <span className="font-bold text-sm">{isFrozen ? 'UNFREEZE VAULT' : 'EMERGENCY FREEZE'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* TVL */}
        <div className="p-5 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10"><Database className="w-12 h-12" /></div>
          <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Total Value Locked</p>
          <h4 className="text-3xl font-black text-white">${balance.toLocaleString()}</h4>
          <div className="flex items-center gap-1 mt-1 text-emerald-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Secured by Enclave
          </div>
        </div>

        {/* Status */}
        <div className="p-5 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10"><Activity className="w-12 h-12" /></div>
          <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Network Status</p>
          <h4 className={`text-2xl font-black mt-1 ${isFrozen ? 'text-rose-400' : 'text-emerald-400'}`}>
            {isFrozen ? 'FROZEN' : 'OPERATIONAL'}
          </h4>
          <p className="text-xs text-white/50 mt-1">
            {isFrozen ? 'All agent transactions halted.' : 'Processing via Jupiter V6 route.'}
          </p>
        </div>

        {/* Policy */}
        <div className="p-5 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10"><Shield className="w-12 h-12" /></div>
          <p className="text-xs text-white/40 uppercase tracking-wider font-medium">ACE Policy Version</p>
          <h4 className="text-2xl font-black text-white mt-1 font-mono">{activePolicy}</h4>
          <p className="text-xs text-white/50 mt-1 cursor-pointer hover:text-blue-400 transition-colors">
            Update Merkle Root →
          </p>
        </div>

        {/* Velocity */}
        <div className="p-5 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10"><Cpu className="w-12 h-12" /></div>
          <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Flash-Freeze Trigger</p>
          <h4 className="text-2xl font-black text-amber-400 mt-1">{velocityThreshold} <span className="text-sm text-white/40 font-medium">/ hr</span></h4>
          <p className="text-xs text-white/50 mt-1">
            Automatic isolation on breach
          </p>
        </div>
      </div>

      {/* On-Chain Verification Section */}
      <div className="rounded-xl border border-white/10 bg-black/60 p-6">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-blue-400" />
          On-Chain Proofs (Solana)
        </h4>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
            <span className="text-sm text-white/60 mb-1 sm:mb-0">Vault Program ID</span>
            <span className="text-sm font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded">2SuD5N8dJ2zmdzvstQzZWjxvS39fptexTfEDDAoaVwJT</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
            <span className="text-sm text-white/60 mb-1 sm:mb-0">TEE Enclave Signer (Ed25519)</span>
            <span className="text-sm font-mono text-white bg-white/10 px-2 py-1 rounded">TEExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
            <span className="text-sm text-white/60 mb-1 sm:mb-0">aGDP Ledger PDA</span>
            <span className="text-sm font-mono text-white bg-white/10 px-2 py-1 rounded">Agdpxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</span>
          </div>
        </div>
      </div>
    </div>
  );
}
